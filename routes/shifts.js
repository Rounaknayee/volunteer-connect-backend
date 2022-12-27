var express = require('express');
const { PrismaClient } = require("@prisma/client");
var router = express.Router();
const userTypeMiddleware = require('../middlewares/userType');
const jwtMiddleware = require('../middlewares/jwt');
const isUserType = require('../misc/istype').isUserType;
const userTypes = require('../misc/enum').userType;
const shiftTypes = require('../misc/enum').shiftType;
const Joi = require('joi');

const prisma = new PrismaClient();

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
    else if(isUserType(req, userTypes.volunteer)) {
        const shifts = await prisma.$queryRaw`
        SELECT id, start_time, end_time, max_volunteers, work_type, location, description FROM shifts
        WHERE id NOT IN (
            SELECT shift_id FROM jobs
            WHERE jobs.user_id = ${req.decoded.user_id}
        )
        AND shifts.max_volunteers > (
            SELECT count(shift_id) FROM jobs
            WHERE shift_id = shifts.id
        )
        AND start_time > NOW()`;
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

router.post('/registershift/:id', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.volunteer)) {
        const shift = await prisma.shifts.findUnique({
            where: {
                id: Number(req.params.id)
            }
        });
        const jobCount = await prisma.jobs.count({
            where: {
                shift_id: Number(req.params.id)
            }
        });
        if (shift) {
            if (jobCount >= shift.max_volunteers) {
                res.status(400).json({ error: 'Shift is full' });
                return;
            }
            try{
                const job = await prisma.jobs.create({
                    data: {
                        shift_id: shift.id,
                        user_id: req.decoded.user_id
                    }
                });
                res.json({ job: job });
                return;
            }
            catch (err) {
                res.status(400).json({ error: 'Shift already registered' });
                return;
            }
        }
        else {
            res.status(404).json({ error: 'Shift not found' });
            return;
        }
    }
    else {
        res.status(401).json({ error: 'User not authorized' });
        return;
    }

});

router.get('/getjobs', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.volunteer)) {
        const shifts = await prisma.$queryRaw`
        SELECT * FROM shifts
        WHERE shifts.id IN (
            SELECT shift_id FROM jobs
            WHERE jobs.user_id = ${req.decoded.user_id}
        )`;
        for (const shift of shifts) {
            shift.date = new Date(shift.start_time).toLocaleDateString();
            shift.start_time = shift.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            shift.end_time = shift.end_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        res.json({ shifts: shifts });
        return
    }
    else if (isUserType(req, userTypes.admin)) {
        const shifts = await prisma.shifts.findMany();
        res.json({ shifts: shifts });
        return
    }
});

router.delete('/dropjob/:id', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.volunteer)) {
        const job = await prisma.jobs.findUnique({
            where: {
                user_id_shift_id:
                    {
                        shift_id: Number(req.params.id),
                        user_id: req.decoded.user_id
                    }
            }
        });
        if (job) {
            const action = await prisma.jobs.delete({
                where: {
                    user_id_shift_id:
                        {
                            shift_id: Number(req.params.id),
                            user_id: req.decoded.user_id
                        }
                }
            });
            if (!action) {
                res.status(500).json({ error: 'Error dropping job' });
                return;
            }
            res.json({ message: 'Job dropped' });
            return;
        }
        else {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
    }
    else {
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.post('/addshift', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    const shifts = Object.keys(shiftTypes).map(function(type) {
        return shiftTypes[type];
    });
    if (isUserType(req, userTypes.admin)) {
        const schema = Joi.object({
            start_time: Joi.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({'string.format': 'Start time must be in the format HH:MM'}),
            end_time: Joi.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({'string.format': 'End time must be in the format HH:MM'}),
            max_volunteers: Joi.number().required().min(1).max(5000),
            date: Joi.string().regex(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/).required().messages({'string.format': 'Date must be in the format YYYY-MM-DD'}),
            location: Joi.string().required(),
            work_type: Joi.any().valid(...shifts).required(),
            description: Joi.string().required()
        });
        const { error, value } = schema.validate(req.body);
        if (error) {
            res.status(422).json({ error: error.details[0].message });
            return;
        }
        const parsedStartDateTime = new Date(value.date + ' ' + value.start_time);
        const parsedEndDateTime = new Date(value.date + ' ' + value.end_time);
        if (parsedStartDateTime >= parsedEndDateTime) {
            res.status(422).json({ error: 'Start time must be before end time' });
            return;
        }
        const timeDiff = parsedEndDateTime - parsedStartDateTime;
        if (timeDiff % 900000 != 0) {
            res.status(422).json({ error: 'Shift must be a multiple of 15 minutes' });
            return;
        }
        const shift = await prisma.shifts.create({
            data: {
                start_time: parsedStartDateTime,
                end_time: parsedEndDateTime,
                work_type: value.work_type,
                max_volunteers: value.max_volunteers,
                location: value.location,
                description: value.description,
            }
        });
        res.json({ shift: shift });
        return;
    }
    else {
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.get('/gettypes', jwtMiddleware, async function(req, res, next) {
    res.json({ types: shiftTypes });
    return;
});

module.exports = router;
