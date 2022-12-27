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

router.get('/getusers', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {

    if (isUserType(req, userTypes.coordinator)) {
        const employee_id = await prisma.users.findUnique({
            where: {
                email: req.decoded.username,
            },
            select: {
                employee_id: true,
            }
        });
        
        const users = await prisma.users.findMany({
            where: {
                employee_id: employee_id.employee_id,
                user_type: userTypes.volunteer,
            },
            select: {
                id: true,
                name: true,
                email: true,
                city: true,
                phone: true,
            }
        });
        res.json({ users: users });
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.get('/getshifts', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.coordinator)) {
        const shifts = await prisma.$queryRaw`
        SELECT id, start_time, end_time, max_volunteers, work_type, location, description FROM shifts
        WHERE shifts.max_volunteers > (
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
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.post('/groupregister/:id', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.coordinator)) {

        const shift_id = parseInt(req.params.id);
        const shift = await prisma.shifts.findUnique({
            where: {
                id: shift_id,
            }
        });

        if (shift === null) {
            res.status(404).json({ error: 'Shift not found' });
            return;
        }

        const employee_id = await prisma.users.findUnique({
            where: {
                email: req.decoded.username,
            },
            select: {
                employee_id: true,
            }
        });

        const users = await prisma.users.findMany({
            where: {
                employee_id: employee_id.employee_id,
                user_type: userTypes.volunteer,
            },
            select: {
                id: true,
            }
        });

        const jobs = await prisma.jobs.createMany({
            data: users.map(user => ({
                shift_id: shift_id,
                user_id: user.id,
            })),
            skipDuplicates: true,
        });

        res.json({ jobs: jobs });

    }

    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.post('/deleteuser/:id', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.coordinator)) {
        const user = await prisma.users.findUnique({
            where: {
                id: Number(req.params.id),
            },
            select: {
                user_type: true,
                employee_id: true,
            }
        });
        const employee_id = await prisma.users.findUnique({
            where: {
                email: req.decoded.username,
            },
            select: {
                employee_id: true,
            }
        });

        if (user.employee_id !== employee_id.employee_id) {
            res.status(401).json({ error: 'User not authorized' });
            return;
        }

        if (user.user_type === userTypes.volunteer) {
            const deletedUser = await prisma.users.delete({
                where: {
                    id: Number(req.params.id),
                }
            });
            res.status(200).json({ message: 'User deleted successfully' });
        }
        else {
            res.status(401).json({ error: 'User not authorized' });
            return;
        }
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

module.exports = router;