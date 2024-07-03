const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('../models/ResponseForm');
const Form = require('../models/UploadVidForm');
require('dotenv').config(); 
const AdminReviewKM = require('../models/Adminfeedback'); 
const AdminVid = require('../models/AdminVid');



const mongoURI = process.env.MONGO_URI;

router.use(express.json());
// upload = video upload + form data

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

router.post('/media', upload.single('video'), async (req, res) => {
    const formData = req.body;
    const videoFile = req.file;

    if (!videoFile) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const videoPath = `uploads/${videoFile.filename}`;

    const formDetails = new Form({
        childName: formData.childName,
        age: formData.age,
        gender: formData.gender,
        fathersName: formData.fathersName,
        fathersContact: formData.fathersContact,
        fathersEmail: formData.fathersEmail,
        mothersName: formData.mothersName,
        mothersContact: formData.mothersContact,
        mothersEmail: formData.mothersEmail,
        message: formData.message,
        videoPath: videoPath
    });

    try {
        await formDetails.save();
        res.status(200).json({ message: 'File uploaded and form data saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error saving form data' });
    }
});

//get uploadform  content in admin portal

router.get('/forms', async (req, res) => {
    try {
        const forms = await Form.find();
        res.status(200).json(forms);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving form data' });
    }
});

//save knowmore = form + Video responses

router.post('/submitFormData', async (req, res) => {
    try {
        const {
            childName,
            age,
            gender,
            fathersName,
            fathersContact,
            fathersEmail,
            mothersName,
            mothersContact,
            mothersEmail,
            message,
            videoResponses
        } = req.body;

        if (!childName || !age || !gender || !fathersName || !fathersContact || !fathersEmail || !mothersName || !mothersContact || !mothersEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newFormData = new FormData({
            childName,
            age,
            gender,
            fathersName,
            fathersContact,
            fathersEmail,
            mothersName,
            mothersContact,
            mothersEmail,
            message,
            videoResponses
        });

        await newFormData.save();
        res.status(200).json({ message: 'Form data submitted successfully' });
    } catch (error) {
        console.error('Error submitting form data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// get knowmore data in admin portal

router.get('/getFormData', async (req, res) => {
    try {
        const formData = await FormData.find();
        res.status(200).json(formData);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching form data' });
    }
});


//admin portal

// Update knowmore status and feedback
router.patch('/updateFormData/:id', async (req, res) => {
    const { status, feedback } = req.body;
    const { id } = req.params;

    try {
        const form = await FormData.findById(id);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const adminReview = new AdminReviewKM({
            formId: id,
            childName: form.childName,
            status,
            feedback
        });

        await adminReview.save();

        res.status(200).json({ message: 'Status and feedback updated successfully' });
    } catch (error) {
        console.error('Error updating form data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

//get feedback on admin portal for knowmore

router.get('/getFormDataWithFeedback', async (req, res) => {
    try {
        const formData = await FormData.find();

        const formDataWithFeedback = await Promise.all(formData.map(async (form) => {
            const feedback = await AdminReviewKM.findOne({ formId: form._id });
            return {
                ...form.toObject(),
                status: feedback ? feedback.status : 'No status',
                feedback: feedback ? feedback.feedback : 'No feedback', 
            };
        }));

        res.status(200).json(formDataWithFeedback);
    } catch (error) {
        console.error('Error fetching form data with feedback:', error);
        res.status(500).json({ error: 'Error fetching form data with feedback' });
    }
});


//admin feedback uploadvid

router.get('/getAdminVidFeedback/:id', async (req, res) => {
    const { id } = req.params;

    try {
        console.log(`Fetching feedback for formId: ${id}`);
        const feedback = await AdminVid.findOne({ formId: id });

        if (!feedback) {
            console.error(`Feedback not found for formId: ${id}`);
            return res.status(404).json({ error: 'Feedback not found' });
        }

        console.log(`Feedback found: ${JSON.stringify(feedback)}`);
        res.status(200).json(feedback);
    } catch (error) {
        console.error('Error fetching feedback for formId:', id, 'Error:', error);
        res.status(500).json({ error: 'Error fetching feedback' });
    }
});


// Update upload feedback in AdminVid collection

// Update upload feedback in AdminVid collection
router.patch('/updateFeedback/:id', async (req, res) => {
    const { status, feedback } = req.body;
    const { id } = req.params;

    try {
        const updatedForm = await AdminVid.findByIdAndUpdate(
            id,
            { status, feedback },
            { new: true }
        );
        if (!updatedForm) {
            return res.status(404).json({ error: 'Form not found' });
        }
        res.json({ updatedForm }); // Ensure we return an object with updatedForm
    } catch (error) {
        console.error('Error updating feedback:', error);
        res.status(500).json({ error: 'Error updating feedback' });
    }
});


// Route to update status and feedback in AdminVid collection
router.patch('/adminvidfeedback/:id', async (req, res) => {
    const { status, feedback } = req.body;
    const { id } = req.params;

    try {
        const form = await FormData.findById(id);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const adminReview = new AdminVid({
            formId: id,
            childName: form.childName,
            status,
            feedback
        });
        await adminReview.save();

        res.status(200).json({ message: 'Status and feedback updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});



module.exports = router;
