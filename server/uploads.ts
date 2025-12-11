
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { uploadFileToDrive } from './drive';
import { getEventById, updateEvent } from './db';
import { z } from 'zod';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/upload - Upload material for an event
router.post('/', upload.single('file'), async (req: any, res) => {
    try {
        const { eventId, materialContent, date, instructorName, title } = req.body;
        const file = req.file;

        // 1. Prepare folder name: Date_Title_Instructor
        // Sanitize to be safe for folder names
        const safeDate = (date || 'NoDate').replace(/[^a-zA-Z0-9-]/g, '');
        const safeTitle = (title || 'NoTitle').replace(/[^a-zA-Z0-9-가-힣]/g, '');
        const safeInstructor = (instructorName || 'Unknown').replace(/[^a-zA-Z0-9-가-힣]/g, '');

        // YYYYMMDD format if date is provided
        let folderDate = safeDate;

        const folderName = `${folderDate}_${safeTitle}_${safeInstructor}`;

        let materialUrl = "";

        // 2. Upload file if exists
        if (file) {
            const result = await uploadFileToDrive(file.path, file.originalname, folderName);
            materialUrl = result.webViewLink || "";

            // Clean up temp file
            fs.unlinkSync(file.path);
        }

        // 3. Update Database (only if eventId is provided)
        const updateData: any = {};
        if (materialUrl) updateData.materialUrl = materialUrl;
        if (materialContent !== undefined) updateData.materialContent = materialContent;

        if (eventId) {
            const id = parseInt(eventId as string);
            if (!isNaN(id)) {
                await updateEvent(id, updateData);
            }
        }

        res.json({ success: true, materialUrl });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });

        // Clean up temp file if error occurred and file exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

export default router;
