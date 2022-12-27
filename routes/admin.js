var express = require('express');

const { PrismaClient } = require("@prisma/client");
const router = require('./users');

const prisma = new PrismaClient();
const jwtMiddleware = require('../middlewares/jwt');
const userTypeMiddleware = require('../middlewares/userType');
const userTypes = require('../misc/enum').userType;
const isUserType = require('../misc/istype').isUserType;

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const csv = require('csvtojson');
const shiftTypes = require('../misc/enum').shiftType;
const Joi = require('joi');

tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'volunteer-connection-'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tmpDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadStorage = multer({ storage: storage })

router.post('/upload', jwtMiddleware, userTypeMiddleware, uploadStorage.single('file'), async function(req, res, next) {
    if (!req.decoded.user_type == userTypes.admin){
        res.end(401).json({ error: 'User not authorized' });
        return;
    }

    if (!req.file) {
        res.status(400).json({ error: 'No file specified!' });
        return;
    }

    if (req.file.mimetype !== 'text/csv') {
        res.status(400).json({ error: 'File must be a csv' });
        return;
    }

    const csv_data = fs.readFileSync(req.file.path)

            // Convert csv to json
    const shifts = await csv().fromString(csv_data.toString());
    const valid_keys = ['start_time', 'end_time', 'max_volunteers', 'date', 'location', 'work_type', 'description'];
    const invalid_keys = Object.keys(shifts[0]).filter(key => !valid_keys.includes(key));
    if (invalid_keys.length > 0) {
        res.status(400).json({ error: 'Invalid header in csv: ' + invalid_keys.join(', ') });
        return;
    }
    const shiftEnum = Object.keys(shiftTypes).map(function(type) {
        return shiftTypes[type];
    });
    queryData = [];
    const schema = Joi.object({
        start_time: Joi.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({'string.format': 'Start time must be in the format HH:MM'}),
        end_time: Joi.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({'string.format': 'End time must be in the format HH:MM'}),
        max_volunteers: Joi.number().required().min(1).max(5000),
        date: Joi.string().regex(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/).required().messages({'string.format': 'Date must be in the format YYYY-MM-DD'}),
        location: Joi.string().required(),
        work_type: Joi.any().valid(...shiftEnum).required(),
        description: Joi.string().required()
    });
    try{
        let i = 1;
        shifts.every(function(shift) {
            const parsedStartDateTime = new Date(shift.date + ' ' + shift.start_time);
            const parsedEndDateTime = new Date(shift.date + ' ' + shift.end_time);
            if (parsedStartDateTime >= parsedEndDateTime) {
                return res.status(422).json({ error: `At line ${i}: Start time must be before end time` });
            }
            const timeDiff = parsedEndDateTime - parsedStartDateTime;
            if (timeDiff % 900000 != 0) {
                return res.status(422).json({ error: `At line ${i}: Shift must be a multiple of 15 minutes` });
            }
    
            shift.max_volunteers = parseInt(shift.max_volunteers);
            const { error } = schema.validate(shift);
            if (error) {
                return res.status(400).json({ error: `At line ${i}: ${error.details[0].message}`}).end();
            }
            temp = {
                start_time: parsedStartDateTime,
                end_time: parsedEndDateTime,
                max_volunteers: shift.max_volunteers,
                location: shift.location,
                description: shift.description,
                work_type: shift.work_type,
            }
            queryData.push(temp);
            i++;
            return true;
        });

        const shift = await prisma.shifts.createMany({
            data: queryData,
            skipDuplicates: true,
        });
        res.json({ message: `${queryData.length} shift(s) uploaded` });
        return;
    }
    catch (err) {
        return;
    }
    finally{
        fs.rm(req.file.path, (err) => {
            if (err) {
                console.error(err)
                return
            }
        });
    }
    
});

router.get('/getshifts', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.admin)) {
        const shifts = await prisma.shifts.findMany({
            select: {
                id: true,
                start_time: true,
                end_time: true,
                max_volunteers: true,
                work_type: true,
                location: true,
                description: true,
            }
        });
        for (const shift of shifts) {
            shift.date = new Date(shift.start_time).toLocaleDateString();
            shift.start_time = shift.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            shift.end_time = shift.end_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        res.json({ shifts: shifts });
        return;
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.delete('/deleteshift/:id', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.admin)) {
        try {
            const shift = await prisma.shifts.delete({
                where: {
                    id: parseInt(req.params.id)
                }
            });
            res.json({ message: 'Shift deleted' });
            return;
        } catch (error) {
            if (error.code == 'P2025') {
                res.status(401).json({ error: 'Invalid shift' });
                return;
            }
        }
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

module.exports = router;