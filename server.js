const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grade_system';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB Atlas');
});

// ==================== AUTHENTICATION SCHEMAS ====================

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'teacher', 'parent', 'student'], 
        default: 'teacher' 
    },
    phone: String,
    department: String,
    assignedClasses: [String],
    assignedSubjects: [String],
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    profileImage: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    token: String,
    ipAddress: String,
    userAgent: String,
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    resource: String,
    resourceId: String,
    details: Object,
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// ==================== AUTHENTICATION MIDDLEWARE ====================

// Generate JWT Token
function generateToken(user) {
    return jwt.sign(
        { 
            id: user._id, 
            username: user.username, 
            role: user.role,
            email: user.email 
        },
        process.env.JWT_SECRET || 'your-secret-key-here-change-in-production',
        { expiresIn: '24h' }
    );
}

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'your-secret-key-here-change-in-production'
        );

        // Check if user exists and is active
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Attach user to request
        req.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            email: user.email,
            fullName: user.fullName,
            assignedClasses: user.assignedClasses,
            assignedSubjects: user.assignedSubjects
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Access denied. ${req.user.role} role cannot access this resource.` 
            });
        }
        next();
    };
};

// Audit logging middleware
const auditLog = async (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        // Log after response is sent
        setTimeout(async () => {
            try {
                await AuditLog.create({
                    userId: req.user?.id,
                    action: req.method,
                    resource: req.originalUrl,
                    resourceId: req.params.id || req.params.matricule || req.params.code,
                    details: {
                        params: req.params,
                        query: req.query,
                        body: req.method === 'GET' ? undefined : req.body // Don't log body for GET
                    },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            } catch (error) {
                console.error('Audit log error:', error);
            }
        }, 0);

        return originalSend.call(this, data);
    };
    next();
};

// ==================== APPLICATION SCHEMAS ====================

const studentSchema = new mongoose.Schema({
    matricule: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    sexe: { type: String, enum: ['M', 'F'], required: true },
    birthDate: Date,
    birthPlace: String,
    parent: String,
    parentEmail: String,
    phone: String,
    className: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to parent/student user account
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

const subjectSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    group: { type: Number, required: true },
    coefficient: { type: Number, default: 1 },
    department: String,
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);

const gradeSchema = new mongoose.Schema({
    className: { type: String, required: true },
    subjectCode: { type: String, required: true },
    session: { type: String, required: true },
    coefficient: { type: Number, default: 1 },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    grades: [{
        matricule: String,
        grade: { type: Number, min: 0, max: 20 },
        absent: { type: Boolean, default: false },
        observation: String
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

gradeSchema.index({ className: 1, subjectCode: 1, session: 1 }, { unique: true });

const Grade = mongoose.model('Grade', gradeSchema);

const settingSchema = new mongoose.Schema({
    school: {
        name: { type: String, default: 'COMPLEXE SCOLAIRE BILINGUE LA TRIDYL' },
        address: { type: String, default: 'BP : 1748 Douala' },
        phone: String,
        email: String,
        website: String,
        principal: String,
        academicYear: { type: String, default: '2024-2025' },
        logo: String
    },
    printing: {
        autoPrint: { type: Boolean, default: true },
        showRank: { type: Boolean, default: true },
        showStatistics: { type: Boolean, default: true },
        watermark: { type: Boolean, default: true }
    },
    grading: {
        passMark: { type: Number, default: 10 },
        excellentMark: { type: Number, default: 16 },
        veryGoodMark: { type: Number, default: 14 },
        goodMark: { type: Number, default: 12 }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

// ==================== UTILITY FUNCTIONS ====================

// Grade conversion functions
function convertMarksToGradeOL(marks) {
    if (marks === 0 || marks === null || marks === undefined) return "NC";
    if (marks < 30) return "U";
    if (marks <= 39) return "E";
    if (marks <= 44) return "D";
    if (marks <= 54) return "C";
    if (marks <= 69) return "B";
    if (marks >= 70) return "A";
    return "NC";
}

function convertMarksToGradeAL(marks) {
    if (marks === 0 || marks === null || marks === undefined) return "NC";
    if (marks < 30) return "F";
    if (marks <= 39) return "O";
    if (marks <= 49) return "E";
    if (marks <= 54) return "D";
    if (marks <= 59) return "C";
    if (marks <= 69) return "B";
    if (marks >= 70) return "A";
    return "NC";
}

function getLevelFromClassName(className) {
    const upperClassName = className.toUpperCase();
    
    if (upperClassName.includes('FORM 4') || upperClassName.includes('FORM 5')) {
        return 'OL';
    } else if (upperClassName.includes('L6') || upperClassName.includes('U6')) {
        return 'AL';
    } else if (upperClassName.includes('FORM 1') || upperClassName.includes('FORM 2') || upperClassName.includes('FORM 3')) {
        return 'JS';
    }
    return 'JS';
}

function convertMarksToAppreciation(marks) {
    if (marks >= 16) return "Excellent";
    if (marks >= 14) return "Très Bien";
    if (marks >= 12) return "Bien";
    if (marks >= 10) return "Passable";
    return "Insuffisant";
}

function getCumulativeSessions(term) {
    const termSessions = {
        1: ['cc1', 'ds1', 'cc2', 'ds2'],
        2: ['cc1', 'ds1', 'cc2', 'ds2', 'cc3', 'ds3', 'cc4', 'ds4'],
        3: ['cc1', 'ds1', 'cc2', 'ds2', 'cc3', 'ds3', 'cc4', 'ds4', 'cc5', 'ds5'],
        all: ['cc1', 'ds1', 'cc2', 'ds2', 'cc3', 'ds3', 'cc4', 'ds4', 'cc5', 'ds5']
    };
    
    return termSessions[term] || termSessions['all'];
}

// ==================== INITIALIZE DEFAULT DATA ====================

async function initializeData() {
    try {
        // Check if we need to create admin user
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const adminUser = await User.create({
                username: 'admin',
                email: 'admin@school.com',
                password: hashedPassword,
                fullName: 'System Administrator',
                role: 'admin',
                phone: '1234567890',
                department: 'Administration'
            });
            console.log('Admin user created:', adminUser.username);
        }

        // Check if we need to seed other data
        const studentCount = await Student.countDocuments();
        const subjectCount = await Subject.countDocuments();
        const gradeCount = await Grade.countDocuments();
        const settingCount = await Setting.countDocuments();

        if (studentCount === 0) {
            const admin = await User.findOne({ role: 'admin' });
            const defaultStudents = [
                { matricule: "E24F10001", name: "John Smith", sexe: "M", birthDate: "2008-05-15", birthPlace: "Douala", parent: "Mr. Smith", phone: "677123456", className: "FORM 1", createdBy: admin._id },
                { matricule: "E24F10002", name: "Mary Johnson", sexe: "F", birthDate: "2008-08-22", birthPlace: "Yaounde", parent: "Mrs. Johnson", phone: "677654321", className: "FORM 1", createdBy: admin._id },
                { matricule: "E23F20001", name: "David Brown", sexe: "M", birthDate: "2007-03-10", birthPlace: "Bafoussam", parent: "Mr. Brown", phone: "677112233", className: "FORM 2", createdBy: admin._id },
                { matricule: "E23F20002", name: "Sarah Wilson", sexe: "F", birthDate: "2007-11-05", birthPlace: "Douala", parent: "Mrs. Wilson", phone: "677445566", className: "FORM 2", createdBy: admin._id }
            ];
            await Student.insertMany(defaultStudents);
            console.log('Default students inserted');
        }

        if (subjectCount === 0) {
            const admin = await User.findOne({ role: 'admin' });
            const defaultSubjects = [
                { code: "MATH", name: "MATHEMATICS", group: 1, coefficient: 2, createdBy: admin._id },
                { code: "PHY", name: "PHYSICS", group: 1, coefficient: 2, createdBy: admin._id },
                { code: "ENG", name: "ENGLISH", group: 2, coefficient: 2, createdBy: admin._id },
                { code: "FREN", name: "FRENCH", group: 2, coefficient: 2, createdBy: admin._id }
            ];
            await Subject.insertMany(defaultSubjects);
            console.log('Default subjects inserted');
        }

        if (settingCount === 0) {
            const admin = await User.findOne({ role: 'admin' });
            await Setting.create({
                school: {
                    name: "COMPLEXE SCOLAIRE BILINGUE LA TRIDYL",
                    address: "BP : 1748 Douala",
                    phone: "686 62 44 83/683 62 71 17",
                    academicYear: "2024-2025"
                },
                printing: {
                    autoPrint: true,
                    showRank: true,
                    showStatistics: true
                },
                createdBy: admin._id
            });
            console.log('Default settings inserted');
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Call initialization
initializeData();

// ==================== AUTHENTICATION ROUTES ====================

// Register new user (admin only)
app.post('/api/auth/register', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { username, email, password, fullName, role, phone, department, assignedClasses, assignedSubjects } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            fullName,
            role,
            phone,
            department,
            assignedClasses,
            assignedSubjects,
            createdBy: req.user.id
        });

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ 
            $or: [{ username }, { email: username }] 
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials or account inactive' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user);

        // Create session
        await Session.create({
            userId: user._id,
            token,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.resetPasswordToken;
        delete userResponse.resetPasswordExpires;

        res.json({
            success: true,
            token,
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user profile
app.get('/api/auth/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -resetPasswordToken -resetPasswordExpires');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
app.put('/api/auth/profile', authenticate, async (req, res) => {
    try {
        const updates = req.body;
        
        // Don't allow role changes via profile update
        if (updates.role) {
            delete updates.role;
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password -resetPasswordToken -resetPasswordExpires');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change password
app.post('/api/auth/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);
        
        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists
            return res.json({ 
                success: true, 
                message: 'If an account exists with this email, you will receive a reset link' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // In production, send email here
        console.log(`Password reset token for ${email}: ${resetToken}`);

        res.json({
            success: true,
            message: 'Password reset instructions sent to email'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset password
app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/auth/logout', authenticate, async (req, res) => {
    try {
        await Session.deleteMany({ userId: req.user.id });
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PROTECTED APPLICATION ROUTES ====================

// Get all users (admin only)
app.get('/api/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find()
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .populate('createdBy', 'username fullName');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all students (with role-based access)
app.get('/api/students', authenticate, auditLog, async (req, res) => {
    try {
        let query = {};
        
        // Teachers can only see their assigned classes
        if (req.user.role === 'teacher' && req.user.assignedClasses?.length > 0) {
            query.className = { $in: req.user.assignedClasses };
        }
        
        // Parents can only see their own children
        if (req.user.role === 'parent') {
            query.userId = req.user.id;
        }
        
        // Students can only see their own data
        if (req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.id });
            if (student) {
                query.matricule = student.matricule;
            } else {
                return res.json([]);
            }
        }

        const students = await Student.find(query)
            .populate('createdBy', 'username fullName')
            .populate('updatedBy', 'username fullName');
            
        // Group by className for compatibility
        const grouped = {};
        students.forEach(student => {
            if (!grouped[student.className]) {
                grouped[student.className] = [];
            }
            grouped[student.className].push(student.toObject());
        });
        
        res.json(grouped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get students by class (with access control)
app.get('/api/students/:className', authenticate, auditLog, async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        
        // Check if teacher is assigned to this class
        if (req.user.role === 'teacher' && 
            req.user.assignedClasses?.length > 0 && 
            !req.user.assignedClasses.includes(className)) {
            return res.status(403).json({ 
                error: 'Access denied. Not assigned to this class.' 
            });
        }
        
        const students = await Student.find({ className });
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add/Update student (admin and teacher)
app.post('/api/students', authenticate, authorize('admin', 'teacher'), auditLog, async (req, res) => {
    try {
        const { student, className } = req.body;
        student.className = className;
        student.updatedBy = req.user.id;
        
        // Check if teacher is assigned to this class
        if (req.user.role === 'teacher' && 
            req.user.assignedClasses?.length > 0 && 
            !req.user.assignedClasses.includes(className)) {
            return res.status(403).json({ 
                error: 'Access denied. Not assigned to this class.' 
            });
        }
        
        const existingStudent = await Student.findOne({ matricule: student.matricule });
        
        if (existingStudent) {
            // Update
            student.updatedBy = req.user.id;
            const updated = await Student.findOneAndUpdate(
                { matricule: student.matricule },
                student,
                { new: true }
            );
            res.json({ success: true, message: 'Student updated successfully', student: updated });
        } else {
            // Create
            student.createdBy = req.user.id;
            const newStudent = await Student.create(student);
            res.status(201).json({ success: true, message: 'Student created successfully', student: newStudent });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete student (admin only)
app.delete('/api/students/:matricule', authenticate, authorize('admin'), auditLog, async (req, res) => {
    try {
        const matricule = req.params.matricule;
        await Student.findOneAndDelete({ matricule });
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all subjects
app.get('/api/subjects', authenticate, auditLog, async (req, res) => {
    try {
        let query = {};
        
        // Teachers can only see their assigned subjects
        if (req.user.role === 'teacher' && req.user.assignedSubjects?.length > 0) {
            query.code = { $in: req.user.assignedSubjects };
        }
        
        const subjects = await Subject.find(query)
            .populate('teachers', 'username fullName')
            .populate('createdBy', 'username fullName');
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add/Update subject (admin only)
app.post('/api/subjects', authenticate, authorize('admin'), auditLog, async (req, res) => {
    try {
        const { subject } = req.body;
        subject.updatedBy = req.user.id;
        
        const existingSubject = await Subject.findOne({ code: subject.code });
        
        if (existingSubject) {
            const updated = await Subject.findOneAndUpdate(
                { code: subject.code },
                subject,
                { new: true }
            );
            res.json({ success: true, message: 'Subject updated successfully', subject: updated });
        } else {
            subject.createdBy = req.user.id;
            const newSubject = await Subject.create(subject);
            res.status(201).json({ success: true, message: 'Subject created successfully', subject: newSubject });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get grades for class, subject, and session (with access control)
app.get('/api/grades/:className/:subjectCode/:session', authenticate, auditLog, async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        const subjectCode = req.params.subjectCode.toUpperCase();
        const session = req.params.session.toLowerCase();
        
        // Check if teacher is assigned to this subject/class
        if (req.user.role === 'teacher') {
            if (req.user.assignedSubjects?.length > 0 && 
                !req.user.assignedSubjects.includes(subjectCode)) {
                return res.status(403).json({ 
                    error: 'Access denied. Not assigned to this subject.' 
                });
            }
            if (req.user.assignedClasses?.length > 0 && 
                !req.user.assignedClasses.includes(className)) {
                return res.status(403).json({ 
                    error: 'Access denied. Not assigned to this class.' 
                });
            }
        }
        
        const grade = await Grade.findOne({ className, subjectCode, session })
            .populate('teacher', 'username fullName')
            .populate('createdBy', 'username fullName');
        res.json(grade || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save grades (teacher and admin)
app.post('/api/grades', authenticate, authorize('admin', 'teacher'), auditLog, async (req, res) => {
    try {
        const { className, subjectCode, session, gradesData, coefficient, date } = req.body;
        
        // Check if teacher is assigned to this subject/class
        if (req.user.role === 'teacher') {
            if (req.user.assignedSubjects?.length > 0 && 
                !req.user.assignedSubjects.includes(subjectCode)) {
                return res.status(403).json({ 
                    error: 'Access denied. Not assigned to this subject.' 
                });
            }
            if (req.user.assignedClasses?.length > 0 && 
                !req.user.assignedClasses.includes(className)) {
                return res.status(403).json({ 
                    error: 'Access denied. Not assigned to this class.' 
                });
            }
        }
        
        const filter = {
            className: className.toUpperCase(),
            subjectCode: subjectCode.toUpperCase(),
            session: session.toLowerCase()
        };
        
        const update = {
            $set: {
                coefficient: coefficient || 1,
                teacher: req.user.id,
                date: date || new Date(),
                grades: gradesData,
                updatedBy: req.user.id
            }
        };
        
        const options = { upsert: true, new: true };
        
        const grade = await Grade.findOneAndUpdate(filter, update, options);
        
        // Set createdBy for new documents
        if (!grade.createdBy) {
            grade.createdBy = req.user.id;
            await grade.save();
        }
        
        res.json({ success: true, message: 'Grades saved successfully', grade });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Calculate term average for a student (with access control)
app.get('/api/averages/:className/:matricule/term/:term', authenticate, auditLog, async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        const matricule = req.params.matricule;
        const term = parseInt(req.params.term);
        
        // Check access for non-admin users
        if (req.user.role === 'teacher') {
            const hasClassAccess = !req.user.assignedClasses || req.user.assignedClasses.includes(className);
            if (!hasClassAccess) {
                return res.status(403).json({ 
                    error: 'Access denied. Not assigned to this class.' 
                });
            }
        } else if (req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.id });
            if (!student || student.matricule !== matricule) {
                return res.status(403).json({ 
                    error: 'Access denied. Can only view own grades.' 
                });
            }
        } else if (req.user.role === 'parent') {
            const student = await Student.findOne({ matricule, userId: req.user.id });
            if (!student) {
                return res.status(403).json({ 
                    error: 'Access denied. Can only view your child\'s grades.' 
                });
            }
        }
        
        const student = await Student.findOne({ matricule, className });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const subjects = await Subject.find();
        const sessions = getCumulativeSessions(term);
        
        const grades = await Grade.find({
            className,
            session: { $in: sessions }
        });
        
        const subjectAverages = [];
        const level = getLevelFromClassName(className);
        
        for (const subject of subjects) {
            const subjectGrades = grades.filter(g => g.subjectCode === subject.code);
            
            let total = 0;
            let count = 0;
            
            subjectGrades.forEach(gradeEntry => {
                const studentGrade = gradeEntry.grades.find(g => g.matricule === matricule);
                if (studentGrade && !studentGrade.absent && studentGrade.grade !== undefined) {
                    total += studentGrade.grade;
                    count++;
                }
            });
            
            if (count > 0) {
                const subjectAverage20 = total / count;
                const subjectAverage100 = subjectAverage20 * 5;
                const subjectLetterGrade = level === 'OL' ? convertMarksToGradeOL(subjectAverage100) : 
                                         level === 'AL' ? convertMarksToGradeAL(subjectAverage100) : '';
                const appreciation = convertMarksToAppreciation(subjectAverage20);
                
                subjectAverages.push({
                    subject: subject.name,
                    code: subject.code,
                    group: subject.group,
                    coefficient: subject.coefficient,
                    average20: subjectAverage20.toFixed(2),
                    average100: subjectAverage100.toFixed(2),
                    letterGrade: subjectLetterGrade,
                    appreciation: appreciation
                });
            }
        }
        
        const totalWeighted = subjectAverages.reduce((sum, subj) => 
            sum + (parseFloat(subj.average20) * subj.coefficient), 0);
        const totalCoefficient = subjectAverages.reduce((sum, subj) => sum + subj.coefficient, 0);
        
        const termAverage20 = totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0;
        const termAverage100 = termAverage20 * 5;
        const termLetterGrade = level === 'OL' ? convertMarksToGradeOL(termAverage100) : 
                              level === 'AL' ? convertMarksToGradeAL(termAverage100) : '';
        
        res.json({
            student: student.toObject(),
            term,
            subjectAverages,
            termAverage20: termAverage20.toFixed(2),
            termAverage100: termAverage100.toFixed(2),
            termLetterGrade,
            totalCoefficient,
            level
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get settings
app.get('/api/settings', authenticate, async (req, res) => {
    try {
        let settings = await Setting.findOne()
            .populate('createdBy', 'username fullName')
            .populate('updatedBy', 'username fullName');
        if (!settings) {
            const admin = await User.findOne({ role: 'admin' });
            settings = await Setting.create({
                school: {
                    name: "COMPLEXE SCOLAIRE BILINGUE LA TRIDYL",
                    address: "BP : 1748 Douala",
                    academicYear: "2024-2025"
                },
                printing: {
                    autoPrint: true,
                    showRank: true,
                    showStatistics: true
                },
                createdBy: admin._id
            });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update settings (admin only)
app.put('/api/settings', authenticate, authorize('admin'), auditLog, async (req, res) => {
    try {
        const settingsData = req.body;
        settingsData.updatedBy = req.user.id;
        
        let settings = await Setting.findOne();
        
        if (settings) {
            settings = await Setting.findOneAndUpdate(
                {},
                settingsData,
                { new: true, runValidators: true }
            );
        } else {
            settingsData.createdBy = req.user.id;
            settings = await Setting.create(settingsData);
        }
        
        res.json({ success: true, message: 'Settings saved successfully', settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get audit logs (admin only)
app.get('/api/audit-logs', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { startDate, endDate, action, userId, page = 1, limit = 50 } = req.query;
        
        let query = {};
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        if (action) query.action = action;
        if (userId) query.userId = userId;
        
        const logs = await AuditLog.find(query)
            .populate('userId', 'username fullName role')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        const total = await AuditLog.countDocuments(query);
        
        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user statistics (admin only)
app.get('/api/statistics/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const userStats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
                }
            }
        ]);
        
        const loginStats = await Session.aggregate([
            {
                $group: {
                    _id: { 
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
            { $limit: 30 }
        ]);
        
        res.json({
            userStats,
            loginStats,
            totalUsers: await User.countDocuments(),
            activeUsers: await User.countDocuments({ isActive: true }),
            totalLogins: await Session.countDocuments()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint (public)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        version: '2.0.0'
    });
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Grade Management System running on http://localhost:${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI}`);
});