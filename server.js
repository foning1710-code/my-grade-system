const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
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

// MongoDB Schemas
const studentSchema = new mongoose.Schema({
    matricule: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    sexe: { type: String, enum: ['M', 'F'], required: true },
    birthDate: Date,
    birthPlace: String,
    parent: String,
    phone: String,
    className: { type: String, required: true }
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

const subjectSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    group: { type: Number, required: true },
    coefficient: { type: Number, default: 1 }
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);

const gradeSchema = new mongoose.Schema({
    className: { type: String, required: true },
    subjectCode: { type: String, required: true },
    session: { type: String, required: true },
    coefficient: { type: Number, default: 1 },
    teacher: String,
    date: { type: Date, default: Date.now },
    grades: [{
        matricule: String,
        grade: { type: Number, min: 0, max: 20 },
        absent: { type: Boolean, default: false },
        observation: String
    }]
}, { timestamps: true });

// Compound index for quick lookups
gradeSchema.index({ className: 1, subjectCode: 1, session: 1 }, { unique: true });

const Grade = mongoose.model('Grade', gradeSchema);

const settingSchema = new mongoose.Schema({
    school: {
        name: { type: String, default: 'COMPLEXE SCOLAIRE BILINGUE LA TRIDYL' },
        address: { type: String, default: 'BP : 1748 Douala' },
        phone: String,
        academicYear: { type: String, default: '2024-2025' }
    },
    printing: {
        autoPrint: { type: Boolean, default: true },
        showRank: { type: Boolean, default: true },
        showStatistics: { type: Boolean, default: true }
    }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

// Initialize default data if collections are empty
async function initializeData() {
    try {
        // Check if we need to seed data
        const studentCount = await Student.countDocuments();
        const subjectCount = await Subject.countDocuments();
        const gradeCount = await Grade.countDocuments();
        const settingCount = await Setting.countDocuments();

        // Insert default students if empty
        if (studentCount === 0) {
            const defaultStudents = [
                { matricule: "E24F10001", name: "John Smith", sexe: "M", birthDate: "2008-05-15", birthPlace: "Douala", parent: "Mr. Smith", phone: "677123456", className: "FORM 1" },
                { matricule: "E24F10002", name: "Mary Johnson", sexe: "F", birthDate: "2008-08-22", birthPlace: "Yaounde", parent: "Mrs. Johnson", phone: "677654321", className: "FORM 1" },
                { matricule: "E23F20001", name: "David Brown", sexe: "M", birthDate: "2007-03-10", birthPlace: "Bafoussam", parent: "Mr. Brown", phone: "677112233", className: "FORM 2" },
                { matricule: "E23F20002", name: "Sarah Wilson", sexe: "F", birthDate: "2007-11-05", birthPlace: "Douala", parent: "Mrs. Wilson", phone: "677445566", className: "FORM 2" },
                { matricule: "E22F30001", name: "Michael Davis", sexe: "M", birthDate: "2006-02-18", birthPlace: "Yaounde", parent: "Mr. Davis", phone: "677778899", className: "FORM 3" },
                { matricule: "E22F30002", name: "Emma Taylor", sexe: "F", birthDate: "2006-09-30", birthPlace: "Douala", parent: "Mrs. Taylor", phone: "677990011", className: "FORM 3" },
                { matricule: "E21A40001", name: "James Anderson", sexe: "M", birthDate: "2005-01-25", birthPlace: "Bafoussam", parent: "Mr. Anderson", phone: "677223344", className: "FORM 4 ART" },
                { matricule: "E21A40002", name: "Olivia Martinez", sexe: "F", birthDate: "2005-07-12", birthPlace: "Douala", parent: "Mrs. Martinez", phone: "677556677", className: "FORM 4 ART" },
                { matricule: "E21S40001", name: "Robert Thomas", sexe: "M", birthDate: "2005-04-08", birthPlace: "Yaounde", parent: "Mr. Thomas", phone: "677889900", className: "FORM 4 SCE" },
                { matricule: "E21S40002", name: "Sophia Garcia", sexe: "F", birthDate: "2005-12-03", birthPlace: "Douala", parent: "Mrs. Garcia", phone: "677001122", className: "FORM 4 SCE" },
                { matricule: "E20A50001", name: "William Rodriguez", sexe: "M", birthDate: "2004-06-20", birthPlace: "Bafoussam", parent: "Mr. Rodriguez", phone: "677334455", className: "FORM 5 ART" },
                { matricule: "E20A50002", name: "Isabella Lee", sexe: "F", birthDate: "2004-10-15", birthPlace: "Douala", parent: "Mrs. Lee", phone: "677667788", className: "FORM 5 ART" },
                { matricule: "E20S50001", name: "Daniel Perez", sexe: "M", birthDate: "2004-03-05", birthPlace: "Yaounde", parent: "Mr. Perez", phone: "677990022", className: "FORM 5 SCE" },
                { matricule: "E20S50002", name: "Ava Hernandez", sexe: "F", birthDate: "2004-11-28", birthPlace: "Douala", parent: "Mrs. Hernandez", phone: "677113344", className: "FORM 5 SCE" },
                { matricule: "E19LA6001", name: "Joseph King", sexe: "M", birthDate: "2003-02-14", birthPlace: "Bafoussam", parent: "Mr. King", phone: "677225566", className: "L6 ART" },
                { matricule: "E19LA6002", name: "Mia Wright", sexe: "F", birthDate: "2003-08-09", birthPlace: "Douala", parent: "Mrs. Wright", phone: "677558899", className: "L6 ART" },
                { matricule: "E19LS6001", name: "Charles Lopez", sexe: "M", birthDate: "2003-05-17", birthPlace: "Yaounde", parent: "Mr. Lopez", phone: "677881122", className: "L6 SC" },
                { matricule: "E19LS6002", name: "Charlotte Hill", sexe: "F", birthDate: "2003-09-24", birthPlace: "Douala", parent: "Mrs. Hill", phone: "677223355", className: "L6 SC" },
                { matricule: "E18UA7001", name: "Thomas Scott", sexe: "M", birthDate: "2002-01-30", birthPlace: "Bafoussam", parent: "Mr. Scott", phone: "677446677", className: "U6 ART" },
                { matricule: "E18UA7002", name: "Amelia Green", sexe: "F", birthDate: "2002-07-22", birthPlace: "Douala", parent: "Mrs. Green", phone: "677779900", className: "U6 ART" },
                { matricule: "E18US7001", name: "Christopher Adams", sexe: "M", birthDate: "2002-04-11", birthPlace: "Yaounde", parent: "Mr. Adams", phone: "677002233", className: "U6 SC" },
                { matricule: "E18US7002", name: "Harper Baker", sexe: "F", birthDate: "2002-12-05", birthPlace: "Douala", parent: "Mrs. Baker", phone: "677335566", className: "U6 SC" }
            ];
            await Student.insertMany(defaultStudents);
            console.log('Default students inserted');
        }

        // Insert default subjects if empty
        if (subjectCount === 0) {
            const defaultSubjects = [
                { code: "MATH", name: "MATHEMATICS", group: 1, coefficient: 2 },
                { code: "PHY", name: "PHYSICS", group: 1, coefficient: 2 },
                { code: "CHEM", name: "CHEMISTRY", group: 1, coefficient: 2 },
                { code: "AMATH", name: "ADDITIONAL MATHEMATICS", group: 1, coefficient: 2 },
                { code: "FMATH", name: "FURTHER MATHEMATICS", group: 1, coefficient: 2 },
                { code: "COMP", name: "COMPUTER SCIENCE/ICT", group: 1, coefficient: 1 },
                { code: "BIO", name: "BIOLOGY", group: 1, coefficient: 2 },
                { code: "HBIO", name: "HUMAN BIOLOGY", group: 1, coefficient: 2 },
                { code: "GEOG", name: "GEOGRAPHY", group: 2, coefficient: 2 },
                { code: "HIST", name: "HISTORY", group: 2, coefficient: 2 },
                { code: "ECON", name: "ECONOMICS", group: 2, coefficient: 2 },
                { code: "COMM", name: "COMMERCE", group: 2, coefficient: 2 },
                { code: "ENG", name: "ENGLISH", group: 2, coefficient: 2 },
                { code: "FREN", name: "FRENCH", group: 2, coefficient: 2 },
                { code: "LIT", name: "LITERATURE", group: 2, coefficient: 1 },
                { code: "CIT", name: "CITIZENSHIP", group: 2, coefficient: 1 },
                { code: "REL", name: "RELIGIOUS STUDIES", group: 2, coefficient: 1 },
                { code: "SPORT", name: "SPORTS", group: 3, coefficient: 1 },
                { code: "MAN", name: "MANUAL LABOUR", group: 3, coefficient: 1 },
                { code: "GEOL", name: "GEOLOGY", group: 1, coefficient: 2 },
                { code: "FSN", name: "FOOD SCIENCE AND NUTRITION", group: 1, coefficient: 2 }
            ];
            await Subject.insertMany(defaultSubjects);
            console.log('Default subjects inserted');
        }

        // Insert sample grades if empty
        if (gradeCount === 0) {
            const sampleGrades = [
                {
                    className: "FORM 4 SCE",
                    subjectCode: "MATH",
                    session: "cc1",
                    coefficient: 2,
                    teacher: "Mr. Mathematics",
                    date: new Date("2024-09-15"),
                    grades: [
                        { matricule: "E21S40001", grade: 15, absent: false, observation: "" },
                        { matricule: "E21S40002", grade: 12, absent: false, observation: "" }
                    ]
                },
                {
                    className: "FORM 4 SCE",
                    subjectCode: "MATH",
                    session: "ds1",
                    coefficient: 3,
                    teacher: "Mr. Mathematics",
                    date: new Date("2024-10-10"),
                    grades: [
                        { matricule: "E21S40001", grade: 16, absent: false, observation: "Excellent work" },
                        { matricule: "E21S40002", grade: 11, absent: false, observation: "" }
                    ]
                }
            ];
            await Grade.insertMany(sampleGrades);
            console.log('Sample grades inserted');
        }

        // Insert default settings if empty
        if (settingCount === 0) {
            const defaultSettings = {
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
                }
            };
            await Setting.create(defaultSettings);
            console.log('Default settings inserted');
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Call initialization
initializeData();

// Grade conversion functions (keep the same as before)
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

function convertPercentageToAppreciation(percentage) {
    if (percentage >= 80) return "Excellent";
    if (percentage >= 70) return "Très Bien";
    if (percentage >= 60) return "Bien";
    if (percentage >= 50) return "Passable";
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

// API Routes

// Get all students
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        // Group by className for compatibility with frontend
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

// Get students by class
app.get('/api/students/:className', async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        const students = await Student.find({ className });
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add/Update student
app.post('/api/students', async (req, res) => {
    try {
        const { student, className } = req.body;
        student.className = className;
        
        const existingStudent = await Student.findOne({ matricule: student.matricule });
        
        if (existingStudent) {
            // Update
            const updated = await Student.findOneAndUpdate(
                { matricule: student.matricule },
                student,
                { new: true }
            );
            res.json({ success: true, message: 'Student updated successfully', student: updated });
        } else {
            // Create
            const newStudent = await Student.create(student);
            res.json({ success: true, message: 'Student created successfully', student: newStudent });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete student
app.delete('/api/students/:matricule', async (req, res) => {
    try {
        const matricule = req.params.matricule;
        await Student.findOneAndDelete({ matricule });
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all subjects
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add/Update subject
app.post('/api/subjects', async (req, res) => {
    try {
        const { subject } = req.body;
        const existingSubject = await Subject.findOne({ code: subject.code });
        
        if (existingSubject) {
            const updated = await Subject.findOneAndUpdate(
                { code: subject.code },
                subject,
                { new: true }
            );
            res.json({ success: true, message: 'Subject updated successfully', subject: updated });
        } else {
            const newSubject = await Subject.create(subject);
            res.json({ success: true, message: 'Subject created successfully', subject: newSubject });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete subject
app.delete('/api/subjects/:code', async (req, res) => {
    try {
        const code = req.params.code;
        await Subject.findOneAndDelete({ code });
        res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get grades for class, subject, and session
app.get('/api/grades/:className/:subjectCode/:session', async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        const subjectCode = req.params.subjectCode.toUpperCase();
        const session = req.params.session.toLowerCase();
        
        const grade = await Grade.findOne({ className, subjectCode, session });
        res.json(grade || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all grades for a student in a specific subject
app.get('/api/grades/student/:className/:subjectCode/:matricule', async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        const subjectCode = req.params.subjectCode.toUpperCase();
        const matricule = req.params.matricule;
        
        const grades = await Grade.find({ className, subjectCode });
        const studentGrades = [];
        
        grades.forEach(gradeEntry => {
            const studentGrade = gradeEntry.grades.find(g => g.matricule === matricule);
            if (studentGrade) {
                studentGrades.push({
                    session: gradeEntry.session,
                    grade: studentGrade.grade,
                    absent: studentGrade.absent,
                    observation: studentGrade.observation,
                    coefficient: gradeEntry.coefficient,
                    date: gradeEntry.date,
                    teacher: gradeEntry.teacher
                });
            }
        });
        
        res.json(studentGrades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save grades
app.post('/api/grades', async (req, res) => {
    try {
        const { className, subjectCode, session, gradesData, coefficient, teacher, date } = req.body;
        
        const filter = {
            className: className.toUpperCase(),
            subjectCode: subjectCode.toUpperCase(),
            session: session.toLowerCase()
        };
        
        const update = {
            $set: {
                coefficient: coefficient || 1,
                teacher: teacher || '',
                date: date || new Date(),
                grades: gradesData
            }
        };
        
        const options = { upsert: true, new: true };
        
        const grade = await Grade.findOneAndUpdate(filter, update, options);
        res.json({ success: true, message: 'Grades saved successfully', grade });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all grades for a class and term
app.get('/api/grades/class/:className/term/:term', async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        const term = parseInt(req.params.term);
        
        const sessions = getCumulativeSessions(term);
        const grades = await Grade.find({ 
            className,
            session: { $in: sessions }
        });
        
        const result = {};
        grades.forEach(grade => {
            const key = `${grade.className}_${grade.subjectCode}_${grade.session}`;
            result[key] = grade;
        });
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Calculate term average for a student
app.get('/api/averages/:className/:matricule/term/:term', async (req, res) => {
    try {
        const className = req.params.className.toUpperCase();
        const matricule = req.params.matricule;
        const term = parseInt(req.params.term);
        
        const student = await Student.findOne({ matricule, className });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const subjects = await Subject.find();
        const sessions = getCumulativeSessions(term);
        
        // Get all relevant grades
        const grades = await Grade.find({
            className,
            session: { $in: sessions }
        });
        
        const subjectAverages = [];
        const level = getLevelFromClassName(className);
        
        // Calculate average for each subject
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
        
        // Calculate weighted average
        const totalWeighted = subjectAverages.reduce((sum, subj) => 
            sum + (parseFloat(subj.average20) * subj.coefficient), 0);
        const totalCoefficient = subjectAverages.reduce((sum, subj) => sum + subj.coefficient, 0);
        
        const termAverage20 = totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0;
        const termAverage100 = termAverage20 * 5;
        const termLetterGrade = level === 'OL' ? convertMarksToGradeOL(termAverage100) : 
                              level === 'AL' ? convertMarksToGradeAL(termAverage100) : '';
        
        // Calculate rank in class (simplified for now)
        const classStudents = await Student.find({ className });
        // In production, you'd want to calculate all averages and sort
        
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
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            // Create default settings if none exist
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
                }
            });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save settings
app.post('/api/settings', async (req, res) => {
    try {
        const settingsData = req.body;
        let settings = await Setting.findOne();
        
        if (settings) {
            settings = await Setting.findOneAndUpdate(
                {},
                settingsData,
                { new: true }
            );
        } else {
            settings = await Setting.create(settingsData);
        }
        
        res.json({ success: true, message: 'Settings saved successfully', settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export data
app.get('/api/export', async (req, res) => {
    try {
        const [students, subjects, grades, settings] = await Promise.all([
            Student.find(),
            Subject.find(),
            Grade.find(),
            Setting.findOne()
        ]);
        
        const exportData = {
            students,
            subjects,
            grades,
            settings,
            exportedAt: new Date().toISOString()
        };
        
        res.setHeader('Content-Disposition', 'attachment; filename=grade_system_data.json');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System info
app.get('/api/system/info', async (req, res) => {
    try {
        const [studentCount, subjectCount, gradeCount] = await Promise.all([
            Student.countDocuments(),
            Subject.countDocuments(),
            Grade.countDocuments()
        ]);
        
        const systemInfo = {
            version: '2.0.0',
            database: 'MongoDB Atlas',
            dataSize: {
                students: studentCount,
                subjects: subjectCount,
                grades: gradeCount
            },
            serverTime: new Date().toISOString(),
            uptime: process.uptime()
        };
        
        res.json(systemInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint (for Heroku)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Grade Management System running on http://localhost:${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI}`);
});
