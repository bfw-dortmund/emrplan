const durations = {
    walk: 45,
    health: 90,
    checkup: 90,
    report: 30,
    test: 90
}

const main = async (event) => {

    const berta = await dberta.open('emrplan', {
        1: {
            appointments: "@id, user, start, staff, task, active",
            settings: "@id"
        }
    });

    if (berta.updated) {
        const tx = await berta.write('appointments');

        [
            {   // Dienstag
                id: 'appointment-global-1',
                user: -1,
                start: 1920,    // DI 08:00
                title: 'Morgenrunde',
                task: 'walk',
                active: 1
            },
            {
                id: 'appointment-global-2',
                user: -1,
                start: 2070,    // DI 10:30
                title: 'Gesundheitsförderung1',
                task: 'health',
                active: 1
            },
            {
                id: 'appointment-global-3',
                user: -1,
                start: 2220,    // DI 13:00
                title: 'Gesundheitsförderung2',
                task: 'health',
                active: 1
            }
        ].forEach((item, i) => {
            tx.appointments.put(item)
                .catch(err => console.error(err));
        })
    }

    const validate = () => {
        berta.read('appointments').then(tx => {
            // return only entries with <user>
            return tx.appointments.queryAnd('user', dberta.ge(0), 'active', dberta.eq(1));
        }).then(arr => {
            arr.forEach(item1 => {

                data.elements[item1.id].setCustomValidity('');

                arr.forEach(item2 => {

                    if ((item1.id !== item2.id)
                        && ((item1.user === item2.user)
                            || (item1.staff === item2.staff))) {

                        const
                            start1 = item1.start,
                            end1 = item1.start + durations[item1.task],
                            start2 = item2.start,
                            end2 = item2.start + durations[item2.task];

                        if ((start1 < end2) && (start2 < end1)) {
                            data.elements[item1.id].setCustomValidity('time');
                        }
                    }
                });

            });
        }).catch(err => {
            console.error(err.message);
        });
    }

    const render = () => {
        var tx;

        berta.read('appointments').then(tx => {
            tx.appointments.queryAnd(
                'active', dberta.eq(1),
                'user', dberta.lt(0)
            ).then(arr1 => {
                for (const user of [...Array(3).keys()]) {
                    tx.appointments.queryAnd(
                        'active', dberta.eq(1),
                        'user', dberta.eq(user)
                    ).then(arr2 => {
                        const arr = arr1.concat(arr2);
                        arr.sort((a, b) => (a.start - b.start));

                        arr.forEach((item, i, arr) => {
                            const [item1, item2] = arr.slice(i, i + 2);

                            if (item2 !== undefined) {
                                const
                                    start1 = item1.start,
                                    end1 = start1 + durations[item1.task],
                                    start2 = item2.start,
                                    end2 = start2 + durations[item2.task];

                                console.assert(Number.isInteger(start1), start1);
                                console.assert(Number.isInteger(start2), start2);
                                console.assert(Number.isInteger(end1), end1);
                                console.assert(Number.isInteger(end2), end2);

                                if ((start1 < end2) && (end1 > start2)) {
                                    if (0 > item.user) {
                                        return;
                                    }

                                    arr.splice(i + 1, 1);
                                }
                            }

                            const text = `${gett(item.start)} ${item.task}\n`;

                            switch (true) {
                                case (0 <= item.start && item.start < 1440):
                                    data.elements[`monday${user}`].value += text;
                                    break;
                                case (1440 <= item.start && item.start < 2880):
                                    data.elements[`tuesday${user}`].value += text;
                                    break;
                            }
                            //console.log(user, gett(item.start), item.task)
                        });
                    })
                }
            })
        });
    }

    // STAFFNAME
    data.elements.staffname.forEach((elem) => {

        elem.id = ['staffname', elem.dataset.staff].join('-');

        elem.addEventListener('change', (event) => {
            // prevent empty cells
            elem.value = elem?.value || elem.defaultValue;

            switch (true) {
                case (elem.value !== elem.defaultValue):
                    berta.write('settings').then(tx => {
                        tx.settings.put({
                            id: elem.id,
                            value: elem.value
                        });
                    }).catch(err => {
                        console.error(err.message);
                    });
                    break;
                default:
                    berta.write('settings').then(tx => {
                        tx.settings.delete(elem.id);
                    }).catch(err => {
                        console.error(err.message);
                    });
            }

            // prevent resetting on reset
            elem.setAttribute('value', elem.value);
        }); // change

        // load data
        berta.read('settings').then(tx => {
            return tx.settings.get(elem.id);
        }).then(data => {
            if (data) {
                elem.value = data.value;
            }
        }).catch(err => {
            console.error(err.message)
        });
    });

    timelist.addEventListener('beforetoggle', (event) => {
        console.dir(event)
    });

    timelist.addEventListener('toggle', (event) => {
        console.dir(event)
    });



    const from = {}
    const to = {}

    // STAFF
    from.staff = 'staff-physician1';
    to.staff = 'staff-psychologist4';

    data.elements.staff.forEach((elem) => {

        elem.id = [elem.name, elem.value].join('-');

        elem.addEventListener('change', (event) => {
            berta.write('settings').then(tx => {
                if (elem.checked) {
                    tx.settings.put({
                        id: elem.id,
                        checked: 1
                    })
                } else {
                    tx.settings.delete(elem.id);
                }
            }).catch(err => {
                console.error(err.message);
            });
        });

    });

    // load data
    berta.read('settings').then(tx => {
        data.elements.staff.forEach((elem) => elem.checked=false);

        tx.settings.getAll(dberta.between(from.staff, to.staff))
            .then(arr => {
                arr.forEach(elem=>{
                    data.elements[elem.id].checked = true;
                });
            }).catch(err => {
                console.error(err.message);
            });
    });

    // PARTICIPANTS
    from.participants = 'participants-0';
    to.participants = 'participants-' + (
        data.elements.participants.length - 1);

    data.elements.participants.forEach((elem) => {

        elem.id = [elem.name, elem.value].join('-');

        elem.addEventListener('change', (event) => {
            berta.write('settings').then(tx => {

                tx.settings.delete(dberta.between(from.participants, to.participants))
                    .then(() => {
                        tx.settings.put({
                            id: elem.id,
                            checked: 1
                        })
                    }).catch(err => {
                        console.error(err.message);
                    });
            });
        });

    });

    // load data
    berta.read('settings').then(tx => {
        tx.settings.get(dberta.between(from.participants, to.participants))
            .then((result) => {
                data.elements[result.id].checked = true;
            }).catch(err => {
                console.error(err.message);
            });
    });

    // APPOINTMENT
    data.elements.appointment.forEach((elem) => {

        elem.id = Object.values(elem.dataset).join('-');
        elem.pattern = "(?i:MO|DI|MI|DO|FR) [01][0-9]:[0-5][0-9]";

        elem.addEventListener('input', (event) => {
            elem.setCustomValidity('');
        });

        // elem.addEventListener('click', (event) => {
        //     timelist.togglePopover({
        //         source: event.target,
        //         force: true
        //     })
        // });

        elem.addEventListener('change', (event) => {

            switch (true) {
                case (elem.value && elem.validity.valid):

                    berta.write('appointments').then(tx => {
                        tx.appointments.put({
                            id: elem.id,
                            start: getn(elem.value),
                            user: parseInt(elem.dataset.user),
                            staff: elem.dataset.staff,
                            task: elem.dataset.task,
                            active: 1
                        });
                    }).then(() => {
                        validate();
                    }).catch(err => {
                        console.error(err.message);
                    });
                    break;

                case (!elem.value):
                    berta.write('appointments').then(tx => {
                        tx.appointments.delete(elem.id);
                    }).then(() => {
                        elem.setCustomValidity('');
                        validate();
                    }).catch(err => {
                        console.error(err.message)
                    });
                    break;
                default:
                    console.log('error')
            }
        }); // change

        // load data
        berta.read('appointments').then(tx => {
            return tx.appointments.get(elem.id);
        }).then(data => {
            if (data) {
                elem.value = gett(data.start)
            }
        }).catch(err => {
            console.error(err.message)
        });
    });

    validate();
    render();
}

addEventListener('load', main);