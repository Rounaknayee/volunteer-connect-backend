const userType = {
    admin: 'admin',
    volunteer: 'volunteer',
    coordinator: 'coordinator',
};

const dayOfWeek = {
    monday: 1,
    tuesday: 2,
    wednesday: 4,
    thursday: 8,
    friday: 16,
    saturday: 32,
    sunday: 64,
};

const shiftType = {
    carpentry: 'carpentry',
    electrical: 'electrical',
    plumbing: 'plumbing',
    painting: 'painting',
    cleaning: 'cleaning',
    administrative: 'administrative',
};

function getDaysOfWeek(day) {
    let days = [];

    1&day && days.push(dayOfWeek.monday);
    2&day && days.push(dayOfWeek.tuesday);
    4&day && days.push(dayOfWeek.wednesday);
    8&day && days.push(dayOfWeek.thursday);
    16&day && days.push(dayOfWeek.friday);
    32&day && days.push(dayOfWeek.saturday);
    64&day && days.push(dayOfWeek.sunday);

    return days;
};

module.exports = {userType, dayOfWeek, shiftType, getDaysOfWeek};