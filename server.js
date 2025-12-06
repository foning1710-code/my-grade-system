const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Add this near the top, after requiring modules
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Update MongoDB connection to handle Render
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1); // Exit if no MongoDB URI
}

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
}).then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    initializeData(); // Call initialization after connection
}).catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Please check your MONGODB_URI environment variable');
});
// Data directory path
const dataDir = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Data file paths
const studentsFile = path.join(dataDir, 'students.json');
const subjectsFile = path.join(dataDir, 'subjects.json');
const gradesFile = path.join(dataDir, 'grades.json');
const settingsFile = path.join(dataDir, 'settings.json');

// Initialize data files if they don't exist
function initializeDataFiles() {
    if (!fs.existsSync(studentsFile)) {
        fs.writeFileSync(studentsFile, JSON.stringify({
            "FORM 1": [
                { matricule: "E24F10001", name: "John Smith", sexe: "M", birthDate: "2008-05-15", birthPlace: "Douala", parent: "Mr. Smith", phone: "677123456" },
                { matricule: "E24F10002", name: "Mary Johnson", sexe: "F", birthDate: "2008-08-22", birthPlace: "Yaounde", parent: "Mrs. Johnson", phone: "677654321" }
            ],
            "FORM 2": [
                { matricule: "E23F20001", name: "David Brown", sexe: "M", birthDate: "2007-03-10", birthPlace: "Bafoussam", parent: "Mr. Brown", phone: "677112233" },
                { matricule: "E23F20002", name: "Sarah Wilson", sexe: "F", birthDate: "2007-11-05", birthPlace: "Douala", parent: "Mrs. Wilson", phone: "677445566" }
            ],
            "FORM 3": [
                { matricule: "E22F30001", name: "Michael Davis", sexe: "M", birthDate: "2006-02-18", birthPlace: "Yaounde", parent: "Mr. Davis", phone: "677778899" },
                { matricule: "E22F30002", name: "Emma Taylor", sexe: "F", birthDate: "2006-09-30", birthPlace: "Douala", parent: "Mrs. Taylor", phone: "677990011" }
            ],
            "FORM 4 ART": [
                { matricule: "E21A40001", name: "James Anderson", sexe: "M", birthDate: "2005-01-25", birthPlace: "Bafoussam", parent: "Mr. Anderson", phone: "677223344" },
                { matricule: "E21A40002", name: "Olivia Martinez", sexe: "F", birthDate: "2005-07-12", birthPlace: "Douala", parent: "Mrs. Martinez", phone: "677556677" }
            ],
            "FORM 4 SCE": [
                { matricule: "E21S40001", name: "Robert Thomas", sexe: "M", birthDate: "2005-04-08", birthPlace: "Yaounde", parent: "Mr. Thomas", phone: "677889900" },
                { matricule: "E21S40002", name: "Sophia Garcia", sexe: "F", birthDate: "2005-12-03", birthPlace: "Douala", parent: "Mrs. Garcia", phone: "677001122" }
            ],
            "FORM 5 ART": [
                { matricule: "E20A50001", name: "William Rodriguez", sexe: "M", birthDate: "2004-06-20", birthPlace: "Bafoussam", parent: "Mr. Rodriguez", phone: "677334455" },
                { matricule: "E20A50002", name: "Isabella Lee", sexe: "F", birthDate: "2004-10-15", birthPlace: "Douala", parent: "Mrs. Lee", phone: "677667788" }
            ],
            "FORM 5 SCE": [
                { matricule: "E20S50001", name: "Daniel Perez", sexe: "M", birthDate: "2004-03-05", birthPlace: "Yaounde", parent: "Mr. Perez", phone: "677990022" },
                { matricule: "E20S50002", name: "Ava Hernandez", sexe: "F", birthDate: "2004-11-28", birthPlace: "Douala", parent: "Mrs. Hernandez", phone: "677113344" }
            ],
            "L6 ART": [
                { matricule: "E19LA6001", name: "Joseph King", sexe: "M", birthDate: "2003-02-14", birthPlace: "Bafoussam", parent: "Mr. King", phone: "677225566" },
                { matricule: "E19LA6002", name: "Mia Wright", sexe: "F", birthDate: "2003-08-09", birthPlace: "Douala", parent: "Mrs. Wright", phone: "677558899" }
            ],
            "L6 SC": [
                { matricule: "E19LS6001", name: "Charles Lopez", sexe: "M", birthDate: "2003-05-17", birthPlace: "Yaounde", parent: "Mr. Lopez", phone: "677881122" },
                { matricule: "E19LS6002", name: "Charlotte Hill", sexe: "F", birthDate: "2003-09-24", birthPlace: "Douala", parent: "Mrs. Hill", phone: "677223355" }
            ],
            "U6 ART": [
                { matricule: "E18UA7001", name: "Thomas Scott", sexe: "M", birthDate: "2002-01-30", birthPlace: "Bafoussam", parent: "Mr. Scott", phone: "677446677" },
                { matricule: "E18UA7002", name: "Amelia Green", sexe: "F", birthDate: "2002-07-22", birthPlace: "Douala", parent: "Mrs. Green", phone: "677779900" }
            ],
            "U6 SC": [
                { matricule: "E18US7001", name: "Christopher Adams", sexe: "M", birthDate: "2002-04-11", birthPlace: "Yaounde", parent: "Mr. Adams", phone: "677002233" },
                { matricule: "E18US7002", name: "Harper Baker", sexe: "F", birthDate: "2002-12-05", birthPlace: "Douala", parent: "Mrs. Baker", phone: "677335566" }
            ]
        }, null, 2));
    }

    if (!fs.existsSync(subjectsFile)) {
        const defaultSubjects = {
            subjects: [
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
            ]
        };
        fs.writeFileSync(subjectsFile, JSON.stringify(defaultSubjects, null, 2));
    }

    if (!fs.existsSync(gradesFile)) {
        // Sample grades for demonstration
        const sampleGrades = {
            "FORM 4 SCE_MATH_cc1": {
                "className": "FORM 4 SCE",
                "subjectCode": "MATH",
                "session": "cc1",
                "coefficient": 2,
                "teacher": "Mr. Mathematics",
                "date": "2024-09-15",
                "grades": [
                    { "matricule": "E21S40001", "grade": "15", "absent": false, "observation": "" },
                    { "matricule": "E21S40002", "grade": "12", "absent": false, "observation": "" }
                ]
            },
            "FORM 4 SCE_MATH_ds1": {
                "className": "FORM 4 SCE",
                "subjectCode": "MATH",
                "session": "ds1",
                "coefficient": 3,
                "teacher": "Mr. Mathematics",
                "date": "2024-10-10",
                "grades": [
                    { "matricule": "E21S40001", "grade": "16", "absent": false, "observation": "Excellent work" },
                    { "matricule": "E21S40002", "grade": "11", "absent": false, "observation": "" }
                ]
            }
        };
        fs.writeFileSync(gradesFile, JSON.stringify(sampleGrades, null, 2));
    }

    if (!fs.existsSync(settingsFile)) {
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
        fs.writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2));
    }
}

// Initialize data files
initializeDataFiles();

// Helper function to read JSON files
function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return {};
    }
}

// Helper function to write JSON files
function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

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
        return 'OL'; // Ordinary Level
    } else if (upperClassName.includes('L6') || upperClassName.includes('U6')) {
        return 'AL'; // Advanced Level
    } else if (upperClassName.includes('FORM 1') || upperClassName.includes('FORM 2') || upperClassName.includes('FORM 3')) {
        return 'JS'; // Junior Secondary
    }
    return 'JS'; // Default to Junior Secondary
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

// NEW FUNCTION: Get cumulative sessions based on term
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
app.get('/api/students', (req, res) => {
    const students = readJsonFile(studentsFile);
    res.json(students);
});

// Get students by class
app.get('/api/students/:className', (req, res) => {
    const students = readJsonFile(studentsFile);
    const className = req.params.className.toUpperCase();
    res.json(students[className] || []);
});

// Add/Update student
app.post('/api/students', (req, res) => {
    const { student, className } = req.body;
    const students = readJsonFile(studentsFile);
    
    if (!students[className]) {
        students[className] = [];
    }
    
    // Check if student exists (by matricule)
    const index = students[className].findIndex(s => s.matricule === student.matricule);
    
    if (index >= 0) {
        // Update existing student
        students[className][index] = student;
    } else {
        // Add new student
        students[className].push(student);
    }
    
    if (writeJsonFile(studentsFile, students)) {
        res.json({ success: true, message: 'Student saved successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Error saving student' });
    }
});

// Delete student
app.delete('/api/students/:className/:matricule', (req, res) => {
    const students = readJsonFile(studentsFile);
    const className = req.params.className.toUpperCase();
    const matricule = req.params.matricule;
    
    if (students[className]) {
        students[className] = students[className].filter(s => s.matricule !== matricule);
        
        if (writeJsonFile(studentsFile, students)) {
            res.json({ success: true, message: 'Student deleted successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Error deleting student' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Class not found' });
    }
});

// Get all subjects
app.get('/api/subjects', (req, res) => {
    const subjects = readJsonFile(subjectsFile);
    res.json(subjects);
});

// Add/Update subject
app.post('/api/subjects', (req, res) => {
    const { subject } = req.body;
    const subjectsData = readJsonFile(subjectsFile);
    
    const index = subjectsData.subjects.findIndex(s => s.code === subject.code);
    
    if (index >= 0) {
        subjectsData.subjects[index] = subject;
    } else {
        subjectsData.subjects.push(subject);
    }
    
    if (writeJsonFile(subjectsFile, subjectsData)) {
        res.json({ success: true, message: 'Subject saved successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Error saving subject' });
    }
});

// Delete subject
app.delete('/api/subjects/:code', (req, res) => {
    const subjectsData = readJsonFile(subjectsFile);
    const code = req.params.code;
    
    subjectsData.subjects = subjectsData.subjects.filter(s => s.code !== code);
    
    if (writeJsonFile(subjectsFile, subjectsData)) {
        res.json({ success: true, message: 'Subject deleted successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Error deleting subject' });
    }
});

// Get grades for class, subject, and session
app.get('/api/grades/:className/:subjectCode/:session', (req, res) => {
    const grades = readJsonFile(gradesFile);
    const className = req.params.className.toUpperCase();
    const subjectCode = req.params.subjectCode.toUpperCase();
    const session = req.params.session.toLowerCase();
    
    const key = `${className}_${subjectCode}_${session}`;
    res.json(grades[key] || {});
});

// NEW ROUTE: Get all grades for a student in a specific subject
app.get('/api/grades/student/:className/:subjectCode/:matricule', (req, res) => {
    const grades = readJsonFile(gradesFile);
    const className = req.params.className.toUpperCase();
    const subjectCode = req.params.subjectCode.toUpperCase();
    const matricule = req.params.matricule;
    
    const studentGrades = [];
    
    Object.keys(grades).forEach(key => {
        if (key.startsWith(`${className}_${subjectCode}_`)) {
            const gradeEntry = grades[key];
            const studentGrade = gradeEntry.grades?.find(g => g.matricule === matricule);
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
        }
    });
    
    res.json(studentGrades);
});

// NEW ROUTE: Get subject ranking for a class
app.get('/api/grades/class/:className/subject/:subjectCode/ranking', (req, res) => {
    const grades = readJsonFile(gradesFile);
    const students = readJsonFile(studentsFile);
    const className = req.params.className.toUpperCase();
    const subjectCode = req.params.subjectCode.toUpperCase();
    
    const classStudents = students[className] || [];
    
    // Calculate cumulative average for each student
    const studentAverages = classStudents.map(student => {
        let total = 0;
        let count = 0;
        
        // Get all sessions
        const sessions = ['cc1', 'ds1', 'cc2', 'ds2', 'cc3', 'ds3', 'cc4', 'ds4', 'cc5', 'ds5'];
        
        sessions.forEach(session => {
            const key = `${className}_${subjectCode}_${session}`;
            if (grades[key] && grades[key].grades) {
                const studentGrade = grades[key].grades.find(g => g.matricule === student.matricule);
                if (studentGrade && !studentGrade.absent && studentGrade.grade) {
                    total += parseFloat(studentGrade.grade);
                    count++;
                }
            }
        });
        
        const average = count > 0 ? total / count : 0;
        
        return {
            matricule: student.matricule,
            name: student.name,
            average: average
        };
    });
    
    // Sort by average (descending)
    studentAverages.sort((a, b) => b.average - a.average);
    
    // Assign ranks
    studentAverages.forEach((student, index) => {
        student.rank = index + 1;
    });
    
    res.json(studentAverages);
});

// Save grades
app.post('/api/grades', (req, res) => {
    const { className, subjectCode, session, gradesData, coefficient, teacher, date } = req.body;
    const grades = readJsonFile(gradesFile);
    
    const key = `${className.toUpperCase()}_${subjectCode.toUpperCase()}_${session.toLowerCase()}`;
    
    grades[key] = {
        className: className.toUpperCase(),
        subjectCode: subjectCode.toUpperCase(),
        session: session.toLowerCase(),
        grades: gradesData,
        coefficient: coefficient || 1,
        teacher: teacher || '',
        date: date || new Date().toISOString().split('T')[0]
    };
    
    if (writeJsonFile(gradesFile, grades)) {
        res.json({ success: true, message: 'Grades saved successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Error saving grades' });
    }
});

// Get all grades for a class and term
app.get('/api/grades/class/:className/term/:term', (req, res) => {
    const grades = readJsonFile(gradesFile);
    const className = req.params.className.toUpperCase();
    const term = parseInt(req.params.term);
    
    const sessions = getCumulativeSessions(term);
    const result = {};
    
    Object.keys(grades).forEach(key => {
        if (key.startsWith(className + '_')) {
            const gradeEntry = grades[key];
            if (sessions.includes(gradeEntry.session)) {
                result[key] = gradeEntry;
            }
        }
    });
    
    res.json(result);
});

// Calculate term average for a student
app.get('/api/averages/:className/:matricule/term/:term', (req, res) => {
    const className = req.params.className.toUpperCase();
    const matricule = req.params.matricule;
    const term = parseInt(req.params.term);
    
    const students = readJsonFile(studentsFile);
    const grades = readJsonFile(gradesFile);
    const subjectsData = readJsonFile(subjectsFile);
    
    const student = students[className]?.find(s => s.matricule === matricule);
    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    const sessions = getCumulativeSessions(term);
    const subjectAverages = [];
    const level = getLevelFromClassName(className);
    
    // Calculate average for each subject
    subjectsData.subjects.forEach(subject => {
        const subjectGrades = [];
        
        sessions.forEach(session => {
            const key = `${className}_${subject.code}_${session}`;
            if (grades[key] && grades[key].grades) {
                const studentGrade = grades[key].grades.find(g => g.matricule === matricule);
                if (studentGrade && !studentGrade.absent) {
                    subjectGrades.push(parseFloat(studentGrade.grade) || 0);
                }
            }
        });
        
        if (subjectGrades.length > 0) {
            const subjectAverage20 = subjectGrades.reduce((a, b) => a + b, 0) / subjectGrades.length;
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
                appreciation: appreciation,
                grades: subjectGrades
            });
        }
    });
    
    // Calculate weighted average
    const totalWeighted = subjectAverages.reduce((sum, subj) => sum + (parseFloat(subj.average20) * subj.coefficient), 0);
    const totalCoefficient = subjectAverages.reduce((sum, subj) => sum + subj.coefficient, 0);
    
    const termAverage20 = totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0;
    const termAverage100 = termAverage20 * 5;
    const termLetterGrade = level === 'OL' ? convertMarksToGradeOL(termAverage100) : 
                          level === 'AL' ? convertMarksToGradeAL(termAverage100) : '';
    
    // Calculate rank in class
    const classStudents = students[className] || [];
    const classAverages = [];
    
    classStudents.forEach(classStudent => {
        let studentTotalWeighted = 0;
        let studentTotalCoefficient = 0;
        
        subjectsData.subjects.forEach(subject => {
            const subjectGrades = [];
            
            sessions.forEach(session => {
                const key = `${className}_${subject.code}_${session}`;
                if (grades[key] && grades[key].grades) {
                    const studentGrade = grades[key].grades.find(g => g.matricule === classStudent.matricule);
                    if (studentGrade && !studentGrade.absent) {
                        subjectGrades.push(parseFloat(studentGrade.grade) || 0);
                    }
                }
            });
            
            if (subjectGrades.length > 0) {
                const subjectAverage = subjectGrades.reduce((a, b) => a + b, 0) / subjectGrades.length;
                studentTotalWeighted += (subjectAverage * subject.coefficient);
                studentTotalCoefficient += subject.coefficient;
            }
        });
        
        const studentAverage = studentTotalCoefficient > 0 ? studentTotalWeighted / studentTotalCoefficient : 0;
        classAverages.push({
            matricule: classStudent.matricule,
            average: studentAverage
        });
    });
    
    // Sort by average (descending)
    classAverages.sort((a, b) => b.average - a.average);
    
    // Find rank for current student
    let rank = 1;
    for (let i = 0; i < classAverages.length; i++) {
        if (classAverages[i].matricule === matricule) {
            rank = i + 1;
            break;
        }
    }
    
    // Determine council decision
    let councilDecision = '';
    if (termAverage20 >= 10) {
        councilDecision = 'PASSABLE';
    } else if (termAverage20 >= 8) {
        councilDecision = 'ACADEMIC WARNING';
    } else {
        councilDecision = 'SERIOUS ACADEMIC WARNING';
    }
    
    // Determine honors based on term average
    const honors = {
        honorRoll: termAverage20 >= 16,
        encouragements: termAverage20 >= 14,
        distinctions: termAverage20 >= 12,
        academicWarning: termAverage20 < 10,
        seriousAcademicWarning: termAverage20 < 8
    };
    
    res.json({
        student,
        term,
        subjectAverages,
        termAverage20: termAverage20.toFixed(2),
        termAverage100: termAverage100.toFixed(2),
        termLetterGrade,
        totalCoefficient,
        rank,
        councilDecision,
        honors,
        level
    });
});

// NEW ROUTE: Generate all report cards for a class
app.post('/api/reports/cards/all', (req, res) => {
    const { className, term } = req.body;
    
    const students = readJsonFile(studentsFile);
    const classStudents = students[className] || [];
    
    if (classStudents.length === 0) {
        return res.status(404).json({ error: 'No students found in this class' });
    }
    
    const allCardsData = [];
    
    // For each student, calculate averages
    classStudents.forEach(student => {
        // This would normally fetch data for each student
        // For now, return sample data structure
        allCardsData.push({
            matricule: student.matricule,
            name: student.name,
            className: className,
            term: term,
            generatedAt: new Date().toISOString()
        });
    });
    
    res.json({
        success: true,
        message: `Generated ${allCardsData.length} report cards for ${className}`,
        data: allCardsData,
        count: allCardsData.length
    });
});

// Generate grade report with comprehensive data
app.post('/api/reports/grades', (req, res) => {
    const { className, subjectCode, term, includeAllSessions } = req.body;
    const grades = readJsonFile(gradesFile);
    const students = readJsonFile(studentsFile);
    const subjectsData = readJsonFile(subjectsFile);
    
    const classStudents = students[className] || [];
    const subject = subjectsData.subjects.find(s => s.code === subjectCode);
    
    if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Use cumulative sessions for comprehensive report
    const sessions = includeAllSessions ? 
        ['cc1', 'ds1', 'cc2', 'ds2', 'cc3', 'ds3', 'cc4', 'ds4', 'cc5', 'ds5'] :
        getCumulativeSessions(term);
    
    const level = getLevelFromClassName(className);
    
    // Collect grades for each student
    const studentGrades = classStudents.map(student => {
        const gradesBySession = {};
        let total = 0;
        let count = 0;
        
        sessions.forEach(session => {
            const key = `${className}_${subjectCode}_${session}`;
            if (grades[key] && grades[key].grades) {
                const studentGrade = grades[key].grades.find(g => g.matricule === student.matricule);
                if (studentGrade) {
                    const gradeValue = parseFloat(studentGrade.grade) || 0;
                    const gradePercentage = gradeValue * 5;
                    const letterGrade = level === 'OL' ? convertMarksToGradeOL(gradePercentage) : 
                                      level === 'AL' ? convertMarksToGradeAL(gradePercentage) : '';
                    
                    gradesBySession[session] = {
                        grade: gradeValue,
                        grade20: gradeValue,
                        grade100: gradePercentage,
                        letterGrade: letterGrade,
                        absent: studentGrade.absent,
                        observation: studentGrade.observation
                    };
                    
                    if (!studentGrade.absent && studentGrade.grade) {
                        total += gradeValue;
                        count++;
                    }
                }
            }
        });
        
        // Calculate cumulative average across all sessions
        let cumulativeAverage = 0;
        if (includeAllSessions) {
            let cumulativeTotal = 0;
            let cumulativeCount = 0;
            
            const allSessions = ['cc1', 'ds1', 'cc2', 'ds2', 'cc3', 'ds3', 'cc4', 'ds4', 'cc5', 'ds5'];
            allSessions.forEach(session => {
                const key = `${className}_${subjectCode}_${session}`;
                if (grades[key] && grades[key].grades) {
                    const studentGrade = grades[key].grades.find(g => g.matricule === student.matricule);
                    if (studentGrade && !studentGrade.absent && studentGrade.grade) {
                        cumulativeTotal += parseFloat(studentGrade.grade);
                        cumulativeCount++;
                    }
                }
            });
            
            cumulativeAverage = cumulativeCount > 0 ? cumulativeTotal / cumulativeCount : 0;
        }
        
        const sessionAverage20 = count > 0 ? total / count : 0;
        const sessionAverage100 = sessionAverage20 * 5;
        const letterGrade = level === 'OL' ? convertMarksToGradeOL(sessionAverage100) : 
                          level === 'AL' ? convertMarksToGradeAL(sessionAverage100) : '';
        const appreciation = convertMarksToAppreciation(sessionAverage20);
        
        return {
            matricule: student.matricule,
            name: student.name,
            sexe: student.sexe,
            grades: gradesBySession,
            average20: sessionAverage20.toFixed(2),
            average100: sessionAverage100.toFixed(2),
            letterGrade: letterGrade,
            appreciation: appreciation,
            count: count,
            cumulativeAverage: includeAllSessions ? cumulativeAverage.toFixed(2) : undefined
        };
    });
    
    // Sort by average (descending) for ranking
    const studentsByAverage = [...studentGrades].sort((a, b) => {
        const avgA = parseFloat(includeAllSessions ? a.cumulativeAverage : a.average20);
        const avgB = parseFloat(includeAllSessions ? b.cumulativeAverage : b.average20);
        return avgB - avgA;
    });
    
    // Assign ranks based on average
    studentsByAverage.forEach((student, index) => {
        student.rank = index + 1;
    });
    
    // Create rank mapping for alphabetical display
    const rankMap = {};
    studentsByAverage.forEach(student => {
        rankMap[student.matricule] = student.rank;
    });
    
    // Calculate statistics
    const totalStudents = studentGrades.length;
    const averages = studentGrades.map(s => parseFloat(includeAllSessions ? s.cumulativeAverage : s.average20));
    const validAverages = averages.filter(avg => !isNaN(avg));
    
    const passed = validAverages.filter(avg => avg >= 10).length;
    const successRate = totalStudents > 0 ? (passed / totalStudents * 100).toFixed(1) : 0;
    
    // Separate by gender
    const maleStudents = studentGrades.filter(s => s.sexe === 'M');
    const femaleStudents = studentGrades.filter(s => s.sexe === 'F');
    
    const maleAverage = maleStudents.length > 0 
        ? maleStudents.reduce((sum, s) => sum + parseFloat(includeAllSessions ? s.cumulativeAverage : s.average20), 0) / maleStudents.length 
        : 0;
    
    const femaleAverage = femaleStudents.length > 0 
        ? femaleStudents.reduce((sum, s) => sum + parseFloat(includeAllSessions ? s.cumulativeAverage : s.average20), 0) / femaleStudents.length 
        : 0;
    
    const overallAverage = validAverages.length > 0 
        ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length 
        : 0;
    
    const overallAverage100 = overallAverage * 5;
    const classLetterGrade = level === 'OL' ? convertMarksToGradeOL(overallAverage100) : 
                           level === 'AL' ? convertMarksToGradeAL(overallAverage100) : '';
    
    // Calculate performance distribution
    const distribution = {
        excellentCount: validAverages.filter(avg => avg >= 16).length,
        veryGoodCount: validAverages.filter(avg => avg >= 14 && avg < 16).length,
        goodCount: validAverages.filter(avg => avg >= 12 && avg < 14).length,
        passableCount: validAverages.filter(avg => avg >= 10 && avg < 12).length,
        insufficientCount: validAverages.filter(avg => avg < 10).length
    };
    
    // Calculate letter grade distribution for OL/AL
    let letterGradeDistribution = '';
    if (level === 'OL' || level === 'AL') {
        const letterGrades = studentGrades.map(s => s.letterGrade);
        const gradeCounts = {};
        letterGrades.forEach(grade => {
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
        letterGradeDistribution = Object.entries(gradeCounts)
            .map(([grade, count]) => `${grade}: ${count}`)
            .join(', ');
    }
    
    res.json({
        className,
        subject: subject.name,
        term,
        level: level,
        date: new Date().toISOString().split('T')[0],
        teacher: subjectCode === 'MATH' ? 'Mr. Mathematics' : 'Teacher',
        studentGrades: studentGrades, // Return all students with their data
        rankMap: rankMap, // Include rank mapping for frontend
        statistics: {
            totalStudents,
            maleStudents: maleStudents.length,
            femaleStudents: femaleStudents.length,
            maleAverage: maleAverage.toFixed(2),
            femaleAverage: femaleAverage.toFixed(2),
            maleAverage100: (maleAverage * 5).toFixed(2),
            femaleAverage100: (femaleAverage * 5).toFixed(2),
            overallAverage: overallAverage.toFixed(2),
            overallAverage100: overallAverage100.toFixed(2),
            classLetterGrade: classLetterGrade,
            highestGrade: validAverages.length > 0 ? Math.max(...validAverages).toFixed(2) : 0,
            lowestGrade: validAverages.length > 0 ? Math.min(...validAverages).toFixed(2) : 0,
            highestGrade100: validAverages.length > 0 ? (Math.max(...validAverages) * 5).toFixed(2) : 0,
            lowestGrade100: validAverages.length > 0 ? (Math.min(...validAverages) * 5).toFixed(2) : 0,
            successRate,
            passed,
            failed: totalStudents - passed,
            ...distribution,
            letterGradeDistribution
        }
    });
});

// Generate PVR (Procès-Verbal)
app.post('/api/reports/pvr', (req, res) => {
    const { className, term, sessionType } = req.body;
    const students = readJsonFile(studentsFile);
    const grades = readJsonFile(gradesFile);
    const subjectsData = readJsonFile(subjectsFile);
    
    const classStudents = students[className] || [];
    
    // Determine sessions based on term and session type
    let sessions = [];
    if (sessionType === 'cc') {
        sessions = term === 1 ? ['cc1', 'cc2'] : term === 2 ? ['cc3', 'cc4'] : ['cc5'];
    } else if (sessionType === 'ds') {
        sessions = term === 1 ? ['ds1', 'ds2'] : term === 2 ? ['ds3', 'ds4'] : ['ds5'];
    } else {
        sessions = getCumulativeSessions(term);
    }
    
    // Get subjects for this class (all subjects for now)
    const subjects = subjectsData.subjects;
    const level = getLevelFromClassName(className);
    
    // Prepare PVR data
    const pvrData = {
        className,
        term,
        sessionType,
        level: level,
        date: new Date().toISOString().split('T')[0],
        students: [],
        subjects: subjects.map(s => ({ 
            code: s.code, 
            name: s.name,
            group: s.group,
            coefficient: s.coefficient
        })),
        statistics: {}
    };
    
    // Collect grades for each student
    classStudents.forEach((student, index) => {
        const studentData = {
            no: index + 1,
            matricule: student.matricule,
            name: student.name,
            sexe: student.sexe,
            grades: {},
            averages: {},
            letterGrades: {}
        };
        
        // For each subject, collect grades for the sessions
        subjects.forEach(subject => {
            const subjectGrades = {};
            let total = 0;
            let count = 0;
            
            sessions.forEach(session => {
                const key = `${className}_${subject.code}_${session}`;
                if (grades[key] && grades[key].grades) {
                    const studentGrade = grades[key].grades.find(g => g.matricule === student.matricule);
                    if (studentGrade) {
                        const gradeValue = parseFloat(studentGrade.grade) || 0;
                        const gradePercentage = gradeValue * 5;
                        const letterGrade = level === 'OL' ? convertMarksToGradeOL(gradePercentage) : 
                                          level === 'AL' ? convertMarksToGradeAL(gradePercentage) : '';
                        
                        subjectGrades[session] = {
                            grade: gradeValue,
                            grade100: gradePercentage,
                            letterGrade: letterGrade,
                            absent: studentGrade.absent
                        };
                        
                        if (!studentGrade.absent && studentGrade.grade) {
                            total += gradeValue;
                            count++;
                        }
                    }
                }
            });
            
            studentData.grades[subject.code] = subjectGrades;
            
            // Calculate average for this subject
            const average20 = count > 0 ? total / count : null;
            const average100 = average20 ? average20 * 5 : null;
            const letterGrade = average100 ? (level === 'OL' ? convertMarksToGradeOL(average100) : 
                                            level === 'AL' ? convertMarksToGradeAL(average100) : '') : null;
            
            studentData.averages[subject.code] = average20 ? average20.toFixed(2) : null;
            studentData.letterGrades[subject.code] = letterGrade;
        });
        
        // Calculate overall average for this student
        const validAverages = Object.values(studentData.averages)
            .filter(avg => avg !== null)
            .map(avg => parseFloat(avg));
        
        const overallAverage20 = validAverages.length > 0 
            ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length 
            : null;
        
        const overallAverage100 = overallAverage20 ? overallAverage20 * 5 : null;
        const overallLetterGrade = overallAverage100 ? (level === 'OL' ? convertMarksToGradeOL(overallAverage100) : 
                                                      level === 'AL' ? convertMarksToGradeAL(overallAverage100) : '') : null;
        
        studentData.overallAverage20 = overallAverage20 ? overallAverage20.toFixed(2) : null;
        studentData.overallAverage100 = overallAverage100 ? overallAverage100.toFixed(2) : null;
        studentData.overallLetterGrade = overallLetterGrade;
        
        pvrData.students.push(studentData);
    });
    
    // Calculate ranks based on overall average
    const studentsByAverage = pvrData.students
        .filter(s => s.overallAverage20 !== null)
        .sort((a, b) => {
            const avgA = parseFloat(a.overallAverage20) || 0;
            const avgB = parseFloat(b.overallAverage20) || 0;
            return avgB - avgA;
        });
    
    // Create rank mapping
    const rankMap = {};
    studentsByAverage.forEach((student, index) => {
        rankMap[student.matricule] = index + 1;
    });
    
    // Assign ranks to all students
    pvrData.students.forEach(student => {
        student.rank = rankMap[student.matricule] || pvrData.students.length;
    });
    
    // Calculate statistics
    const totalStudents = pvrData.students.length;
    const maleStudents = pvrData.students.filter(s => s.sexe === 'M');
    const femaleStudents = pvrData.students.filter(s => s.sexe === 'F');
    
    const averages = pvrData.students
        .filter(s => s.overallAverage20 !== null)
        .map(s => parseFloat(s.overallAverage20));
    
    const overallAverage20 = averages.length > 0 
        ? averages.reduce((sum, avg) => sum + avg, 0) / averages.length 
        : 0;
    
    const overallAverage100 = overallAverage20 * 5;
    const overallLetterGrade = level === 'OL' ? convertMarksToGradeOL(overallAverage100) : 
                             level === 'AL' ? convertMarksToGradeAL(overallAverage100) : '';
    
    const passed = pvrData.students.filter(s => parseFloat(s.overallAverage20) >= 10).length;
    
    pvrData.statistics = {
        totalStudents,
        maleStudents: maleStudents.length,
        femaleStudents: femaleStudents.length,
        overallAverage20: overallAverage20.toFixed(2),
        overallAverage100: overallAverage100.toFixed(2),
        overallLetterGrade: overallLetterGrade,
        highestAverage20: averages.length > 0 ? Math.max(...averages).toFixed(2) : 0,
        lowestAverage20: averages.length > 0 ? Math.min(...averages).toFixed(2) : 0,
        highestAverage100: averages.length > 0 ? (Math.max(...averages) * 5).toFixed(2) : 0,
        lowestAverage100: averages.length > 0 ? (Math.min(...averages) * 5).toFixed(2) : 0,
        successRate: totalStudents > 0 ? (passed / totalStudents * 100).toFixed(1) : 0,
        passed,
        failed: totalStudents - passed
    };
    
    res.json(pvrData);
});

// Generate PDF for report card
app.post('/api/reports/card/pdf', (req, res) => {
    const { className, matricule, term } = req.body;
    
    // For now, return a placeholder response
    // In production, you would use a PDF library like pdfkit, puppeteer, or html-pdf
    res.json({
        success: true,
        message: 'PDF generation endpoint. In production, this would generate a PDF file.',
        data: {
            className,
            matricule,
            term,
            timestamp: new Date().toISOString()
        }
    });
});

// NEW ROUTE: Generate PDFs for all report cards in a class
app.post('/api/reports/cards/pdf', (req, res) => {
    const { className, term } = req.body;
    
    // For now, return a placeholder response
    // In production, you would generate PDFs for each student and zip them
    res.json({
        success: true,
        message: 'Bulk PDF generation endpoint. In production, this would generate a zip file with PDFs for all students.',
        data: {
            className,
            term,
            timestamp: new Date().toISOString(),
            estimatedFiles: 0 // Would be actual count in production
        }
    });
});

// Get statistics
app.get('/api/statistics', (req, res) => {
    const students = readJsonFile(studentsFile);
    const grades = readJsonFile(gradesFile);
    
    const classStats = {};
    let totalStudents = 0;
    let totalMale = 0;
    let totalFemale = 0;
    
    // Calculate statistics for each class
    Object.keys(students).forEach(className => {
        const classStudents = students[className] || [];
        const maleCount = classStudents.filter(s => s.sexe === 'M').length;
        const femaleCount = classStudents.filter(s => s.sexe === 'F').length;
        
        classStats[className] = {
            total: classStudents.length,
            male: maleCount,
            female: femaleCount,
            level: getLevelFromClassName(className)
        };
        
        totalStudents += classStudents.length;
        totalMale += maleCount;
        totalFemale += femaleCount;
    });
    
    // Calculate grade statistics
    const allGrades = [];
    Object.keys(grades).forEach(key => {
        const gradeEntry = grades[key];
        if (gradeEntry.grades) {
            gradeEntry.grades.forEach(grade => {
                if (!grade.absent && grade.grade) {
                    const gradeValue = parseFloat(grade.grade) || 0;
                    allGrades.push({
                        value: gradeValue,
                        percentage: gradeValue * 5,
                        class: gradeEntry.className,
                        level: getLevelFromClassName(gradeEntry.className)
                    });
                }
            });
        }
    });
    
    // Calculate grade distributions by level
    const olGrades = allGrades.filter(g => g.level === 'OL');
    const alGrades = allGrades.filter(g => g.level === 'AL');
    const jsGrades = allGrades.filter(g => g.level === 'JS');
    
    const gradeStats = {
        totalGrades: allGrades.length,
        averageGrade: allGrades.length > 0 ? (allGrades.reduce((a, b) => a + b.value, 0) / allGrades.length).toFixed(2) : 0,
        averagePercentage: allGrades.length > 0 ? (allGrades.reduce((a, b) => a + b.percentage, 0) / allGrades.length).toFixed(2) : 0,
        highestGrade: allGrades.length > 0 ? Math.max(...allGrades.map(g => g.value)).toFixed(2) : 0,
        lowestGrade: allGrades.length > 0 ? Math.min(...allGrades.map(g => g.value)).toFixed(2) : 0
    };
    
    // Grade distribution
    const distribution = {
        excellent: allGrades.filter(g => g.value >= 16).length,
        veryGood: allGrades.filter(g => g.value >= 14 && g.value < 16).length,
        good: allGrades.filter(g => g.value >= 12 && g.value < 14).length,
        passable: allGrades.filter(g => g.value >= 10 && g.value < 12).length,
        insufficient: allGrades.filter(g => g.value < 10).length
    };
    
    // Letter grade distribution for OL
    const olLetterDistribution = {
        A: olGrades.filter(g => convertMarksToGradeOL(g.percentage) === 'A').length,
        B: olGrades.filter(g => convertMarksToGradeOL(g.percentage) === 'B').length,
        C: olGrades.filter(g => convertMarksToGradeOL(g.percentage) === 'C').length,
        D: olGrades.filter(g => convertMarksToGradeOL(g.percentage) === 'D').length,
        E: olGrades.filter(g => convertMarksToGradeOL(g.percentage) === 'E').length,
        U: olGrades.filter(g => convertMarksToGradeOL(g.percentage) === 'U').length,
        NC: olGrades.filter(g => convertMarksToGradeOL(g.percentage) === 'NC').length
    };
    
    // Letter grade distribution for AL
    const alLetterDistribution = {
        A: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'A').length,
        B: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'B').length,
        C: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'C').length,
        D: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'D').length,
        E: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'E').length,
        O: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'O').length,
        F: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'F').length,
        NC: alGrades.filter(g => convertMarksToGradeAL(g.percentage) === 'NC').length
    };
    
    res.json({
        enrollment: {
            totalStudents,
            totalMale,
            totalFemale,
            byClass: classStats
        },
        grades: gradeStats,
        distribution,
        olLetterDistribution,
        alLetterDistribution,
        lastUpdated: new Date().toISOString()
    });
});

// Get settings
app.get('/api/settings', (req, res) => {
    const settings = readJsonFile(settingsFile);
    res.json(settings);
});

// Save settings
app.post('/api/settings', (req, res) => {
    const settings = req.body;
    
    if (writeJsonFile(settingsFile, settings)) {
        res.json({ success: true, message: 'Settings saved successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Error saving settings' });
    }
});

// Backup data
app.get('/api/backup', (req, res) => {
    const backupData = {
        students: readJsonFile(studentsFile),
        subjects: readJsonFile(subjectsFile),
        grades: readJsonFile(gradesFile),
        settings: readJsonFile(settingsFile),
        timestamp: new Date().toISOString()
    };
    
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    
    if (writeJsonFile(backupFile, backupData)) {
        res.json({ 
            success: true, 
            message: 'Backup created successfully',
            filename: path.basename(backupFile),
            timestamp: backupData.timestamp
        });
    } else {
        res.status(500).json({ success: false, message: 'Error creating backup' });
    }
});

// Export data
app.get('/api/export', (req, res) => {
    const exportData = {
        students: readJsonFile(studentsFile),
        subjects: readJsonFile(subjectsFile),
        grades: readJsonFile(gradesFile),
        settings: readJsonFile(settingsFile),
        exportedAt: new Date().toISOString()
    };
    
    res.setHeader('Content-Disposition', 'attachment; filename=grade_system_data.json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
});

// Import data
app.post('/api/import', (req, res) => {
    const importData = req.body;
    
    if (!importData.students || !importData.subjects || !importData.grades || !importData.settings) {
        return res.status(400).json({ success: false, message: 'Invalid import data' });
    }
    
    // Create backup before import
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `pre_import_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const preImportData = {
        students: readJsonFile(studentsFile),
        subjects: readJsonFile(subjectsFile),
        grades: readJsonFile(gradesFile),
        settings: readJsonFile(settingsFile),
        timestamp: new Date().toISOString()
    };
    
    writeJsonFile(backupFile, preImportData);
    
    // Import new data
    const importResults = {
        students: writeJsonFile(studentsFile, importData.students),
        subjects: writeJsonFile(subjectsFile, importData.subjects),
        grades: writeJsonFile(gradesFile, importData.grades),
        settings: writeJsonFile(settingsFile, importData.settings)
    };
    
    const allSuccessful = Object.values(importResults).every(result => result);
    
    if (allSuccessful) {
        res.json({ 
            success: true, 
            message: 'Data imported successfully',
            backupCreated: true,
            backupFile: path.basename(backupFile)
        });
    } else {
        res.status(500).json({ 
            success: false, 
            message: 'Error importing data. Backup has been created.',
            backupFile: path.basename(backupFile)
        });
    }
});

// Get system info
app.get('/api/system/info', (req, res) => {
    const systemInfo = {
        version: '2.0.0',
        lastBackup: getLastBackupTime(),
        dataSize: {
            students: Object.keys(readJsonFile(studentsFile)).length,
            subjects: readJsonFile(subjectsFile).subjects.length,
            grades: Object.keys(readJsonFile(gradesFile)).length
        },
        serverTime: new Date().toISOString()
    };
    
    res.json(systemInfo);
});

// Helper function to get last backup time
function getLastBackupTime() {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        return 'Never';
    }
    
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        return 'Never';
    }
    
    files.sort((a, b) => {
        return fs.statSync(path.join(backupDir, b)).mtime.getTime() - 
               fs.statSync(path.join(backupDir, a)).mtime.getTime();
    });
    
    const lastBackup = files[0];
    const stats = fs.statSync(path.join(backupDir, lastBackup));
    return stats.mtime.toISOString();
}

// Reset data
app.post('/api/reset', (req, res) => {
    const { confirm } = req.body;
    
    if (confirm !== 'YES_RESET_ALL_DATA') {
        return res.status(400).json({ 
            success: false, 
            message: 'Confirmation required. Send confirm: "YES_RESET_ALL_DATA"' 
        });
    }
    
    // Create backup before reset
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `pre_reset_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const preResetData = {
        students: readJsonFile(studentsFile),
        subjects: readJsonFile(subjectsFile),
        grades: readJsonFile(gradesFile),
        settings: readJsonFile(settingsFile),
        timestamp: new Date().toISOString()
    };
    
    writeJsonFile(backupFile, preResetData);
    
    // Reset to initial state
    initializeDataFiles();
    
    res.json({ 
        success: true, 
        message: 'Data reset successfully. Backup has been created.',
        backupFile: path.basename(backupFile)
    });
});

// Default route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Grade Management System running on http://localhost:${PORT}`);
    console.log(`Data directory: ${dataDir}`);
    console.log(`Backup directory: ${path.join(__dirname, 'backups')}`);
});

