// ===============================================
// JOB PORTAL - APP.JS
// Node.js + Express + MySQL
// ===============================================

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend folders
app.use(express.static(path.join(__dirname, "public")));

// MySQL configuration
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "MyNewPass123",
    database: "jobportal"
};

let db;

// Dropdown options
const dropdownOptions = {
    titles: [
        "Software Developer",
        "Web Developer",
        "Java Developer",
        "Python Developer",
        "Frontend Developer",
        "Backend Developer",
        "Full Stack Developer",
        "Data Analyst",
        "Data Scientist",
        "Software Tester",
        "Cybersecurity Analyst",
        "Cloud Engineer",
        "AI Engineer",
        "Intern"
    ],
    locations: [
        "Kurnool",
        "Hyderabad",
        "Bengaluru",
        "Chennai",
        "Vijayawada",
        "Visakhapatnam",
        "Pune",
        "Mumbai",
        "Delhi",
        "Remote"
    ],
    skills: [
        "HTML, CSS, JavaScript",
        "Java",
        "Python",
        "C and C++",
        "React",
        "Node.js",
        "SQL and MySQL",
        "Data Analysis",
        "Machine Learning",
        "Cloud Computing",
        "Cybersecurity",
        "Communication Skills"
    ],
    companies: [
        "TCS",
        "Infosys",
        "Wipro",
        "Accenture",
        "Tech Mahindra",
        "HCLTech",
        "IBM",
        "Cognizant",
        "Microsoft",
        "Other"
    ]
};

// Create database and table
async function connectDatabase() {
    // Create database if it does not exist
    const initialConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
    });

    await initialConnection.query(
        "CREATE DATABASE IF NOT EXISTS jobportal"
    );

    await initialConnection.end();

    // Connect to project database
    db = await mysql.createConnection(dbConfig);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS jobs (
            job_id INT PRIMARY KEY,
            title VARCHAR(150) NOT NULL,
            company_name VARCHAR(150) NOT NULL,
            location VARCHAR(150) NOT NULL,
            salary DECIMAL(12,2) NOT NULL,
            skills_required TEXT NOT NULL,
            interview_date DATE NOT NULL,
            number_of_posts INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log("MySQL connected successfully!");
    console.log("Job Portal database and table are ready.");
}

// Check API
app.get("/api", (req, res) => {
    res.json({
        message: "Job Portal API is running successfully."
    });
});

// Dropdown data for frontend
app.get("/api/options", (req, res) => {
    res.json(dropdownOptions);
});

// Get all jobs
app.get("/api/jobs", async (req, res) => {
    try {
        const [jobs] = await db.execute(
            "SELECT * FROM jobs ORDER BY job_id DESC"
        );

        res.json(jobs);
    } catch (error) {
        console.error("Fetch jobs error:", error.message);
        res.status(500).json({
            message: "Unable to load jobs."
        });
    }
});

// Search jobs
app.get("/api/jobs/search", async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();

        if (!q) {
            return res.status(400).json({
                message: "Please select or enter a job to search."
            });
        }

        const keyword = `%${q}%`;

        const [jobs] = await db.execute(
            `SELECT * FROM jobs
             WHERE CAST(job_id AS CHAR) LIKE ?
                OR title LIKE ?
                OR company_name LIKE ?
                OR location LIKE ?
                OR skills_required LIKE ?
             ORDER BY job_id DESC`,
            [keyword, keyword, keyword, keyword, keyword]
        );

        res.json(jobs);
    } catch (error) {
        console.error("Search error:", error.message);
        res.status(500).json({
            message: "Unable to search jobs."
        });
    }
});

// Get one job by ID
app.get("/api/jobs/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid Job ID."
            });
        }

        const [jobs] = await db.execute(
            "SELECT * FROM jobs WHERE job_id = ?",
            [id]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                message: "Job not found."
            });
        }

        res.json(jobs[0]);
    } catch (error) {
        console.error("Get job error:", error.message);
        res.status(500).json({
            message: "Unable to load job."
        });
    }
});

// Validate all compulsory fields
function validateJob(body) {
    const {
        job_id,
        title,
        company_name,
        location,
        salary,
        skills_required,
        interview_date,
        number_of_posts
    } = body;

    const id = Number(job_id);
    const salaryAmount = Number(salary);
    const posts = Number(number_of_posts);

    if (
        job_id === undefined ||
        job_id === null ||
        String(job_id).trim() === "" ||
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        return "Enter a valid positive Job ID.";
    }

    if (
        typeof title !== "string" || !title.trim() ||
        typeof company_name !== "string" || !company_name.trim() ||
        typeof location !== "string" || !location.trim() ||
        typeof skills_required !== "string" || !skills_required.trim()
    ) {
        return "All text fields are compulsory.";
    }

    if (
        salary === undefined ||
        salary === null ||
        String(salary).trim() === "" ||
        !Number.isFinite(salaryAmount) ||
        salaryAmount <= 0
    ) {
        return "Enter a valid salary greater than zero.";
    }

    if (
        typeof interview_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(interview_date)
    ) {
        return "Select a valid interview date.";
    }

    const date = new Date(interview_date + "T00:00:00Z");

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== interview_date
    ) {
        return "Enter a valid interview date.";
    }

    if (
        number_of_posts === undefined ||
        number_of_posts === null ||
        String(number_of_posts).trim() === "" ||
        !Number.isSafeInteger(posts) ||
        posts <= 0
    ) {
        return "Number of posts must be a positive whole number.";
    }

    return null;
}

// Insert job
app.post("/api/jobs", async (req, res) => {
    try {
        const validationError = validateJob(req.body);

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const {
            job_id,
            title,
            company_name,
            location,
            salary,
            skills_required,
            interview_date,
            number_of_posts
        } = req.body;

        await db.execute(
            `INSERT INTO jobs
            (job_id, title, company_name, location, salary,
             skills_required, interview_date, number_of_posts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                Number(job_id),
                title.trim(),
                company_name.trim(),
                location.trim(),
                Number(salary),
                skills_required.trim(),
                interview_date,
                Number(number_of_posts)
            ]
        );

        res.status(201).json({
            message: "Job saved successfully!",
            job_id: Number(job_id)
        });
    } catch (error) {
        console.error("Save job error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "This Job ID already exists. Use a unique ID."
            });
        }

        res.status(500).json({
            message: "Unable to save job.",
            error: error.message
        });
    }
});

// Update job
app.put("/api/jobs/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid Job ID."
            });
        }

        const validationError = validateJob({
            ...req.body,
            job_id: id
        });

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const {
            title,
            company_name,
            location,
            salary,
            skills_required,
            interview_date,
            number_of_posts
        } = req.body;

        const [result] = await db.execute(
            `UPDATE jobs SET
                title = ?,
                company_name = ?,
                location = ?,
                salary = ?,
                skills_required = ?,
                interview_date = ?,
                number_of_posts = ?
             WHERE job_id = ?`,
            [
                title.trim(),
                company_name.trim(),
                location.trim(),
                Number(salary),
                skills_required.trim(),
                interview_date,
                Number(number_of_posts),
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Job not found."
            });
        }

        res.json({
            message: "Job updated successfully!"
        });
    } catch (error) {
        console.error("Update job error:", error.message);
        res.status(500).json({
            message: "Unable to update job."
        });
    }
});

// Delete job
app.delete("/api/jobs/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid Job ID."
            });
        }

        const [result] = await db.execute(
            "DELETE FROM jobs WHERE job_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Job not found."
            });
        }

        res.json({
            message: "Job deleted successfully!"
        });
    } catch (error) {
        console.error("Delete job error:", error.message);
        res.status(500).json({
            message: "Unable to delete job."
        });
    }
});

// Start server
async function startServer() {
    try {
        await connectDatabase();

        app.listen(PORT, () => {
            console.log(
                `Job Portal running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();