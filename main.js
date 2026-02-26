const durations = {
    common: 60,
    checkup: 90,
    report: 30,
    test: 90
}

const title = {
    checkup: 'Arzt/Ärztin',
    report: 'Psychologe/in',
    test: 'Psychologe/in',
}

const main = async (event) => {

    const berta = await dberta.open('emrplan', {
        1: {
            appointments: "@id, user, start, staff, task, active",
            settings: "@id"
        }
    });

    async function loadTemplate(id) {

        const tx = await berta.write('appointments', 'settings');

        await tx.appointments.clear();
        await tx.settings.clear();

        const script = document.scripts.namedItem(id);
        const obj = JSON.parse(script.textContent);

        for (const item of obj.appointments) {
            await tx.appointments.add(item);
        }

        for (const item of obj.settings) {
            await tx.settings.add(item);
        }
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
        const week = new Date(data.elements.week.valueAsNumber);
        const instant = week.toTemporalInstant();
        const zdt = instant.toZonedDateTimeISO("UTC");
        const date = zdt.toPlainDate();
        //console.log(week)
        data.elements.monday.forEach(elem => elem.value = '');
        data.elements.mondate.forEach(elem => elem.value = dateOrHoliday(date));

        data.elements.tuesday.forEach(elem => elem.value = '');
        data.elements.tuesdate.forEach(elem => elem.value = dateOrHoliday(date.add({ days: 1 })));

        berta.read('appointments').then(tx => {

            // 1st collect common appointments
            tx.appointments.queryAnd(
                'active', dberta.eq(1),
                'user', dberta.lt(0)
            ).then(arr1 => {
                // total number off active user
                const count = parseInt(data.elements.participants.value) + 1;

                // 2nd collect appointments by user
                for (const user of [...Array(count).keys()]) {
                    tx.appointments.queryAnd(
                        'active', dberta.eq(1),
                        'user', dberta.eq(user)
                    ).then(arr2 => {
                        // 3rd merge common and user appointments
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

                            const text = `${gett(item.start).substring(3)} ${item?.title || title[item.task]}\n`;

                            switch (true) {
                                case (0 <= item.start && item.start < 1440):
                                    data.elements[`monday`][user].value += text;
                                    break;
                                case (1440 <= item.start && item.start < 2880):
                                    data.elements[`tuesday`][user].value += text;
                                    break;
                            }
                        });
                    });
                }
            })
        });
    }

    async function refresh(id) {
        const tx = await berta.write('appointments', 'settings');

        const settings = await tx.settings.getAll(id);

        for (const item of settings) {

            switch (true) {
                case Object.hasOwn(item, 'values'):
                    Array.from(data.elements[item.id]).forEach(option => {
                        option.selected = item.values.includes(option.value);
                    });
                    break;

                case Object.hasOwn(item, 'valueAsNumber'):
                    data.elements[item.id].valueAsNumber = item.valueAsNumber;
                    break;

                case Object.hasOwn(item, 'value'):
                    data.elements[item.id].value = item.value;

                    // if element are referenced by label.for
                    /*                     data.elements[item.id]?.labels?.forEach(label => {
                                            label.textContent = item.value;
                                        }) */
                    break;

                default:
                    console.error('error', item)
            }
        }

        const appointments = await tx.appointments.getAll(id);

        data.elements.commontimes.value = '';
        
        for (const item of appointments) {
            switch (true) {
                case (item.user === -1):
                    data.elements.commontimes.value += `${gett(item.start)} ${item.title}\n`;
                    break;

                case (item.active === 1):
                    data.elements[item.id].value = gett(item.start);
                    break;

                case (item.active === 0):
                    // do nothing
                    break;

                default:
                    console.error('error');
            }

        }

        Array.from(data.elements.staff).forEach((option, i) => {
            option.label = data.elements.staffname[i].value;
        });
    }

    // USERNAME
    data.elements.username.forEach(elem => {

        elem.addEventListener('change', async (event) => {

            const tx = await berta.write('settings');

            // prevent empty cells
            event.target.value = event.target?.value || event.target.defaultValue;

            switch (true) {
                case (event.target.value !== event.target.defaultValue):
                    await tx.settings.put({
                        id: event.target.id,
                        value: event.target.value
                    });
                    break;

                default:
                    tx.settings.delete(event.target.id);
            }

            refresh(event.target.id);
        });
    });

    // STAFFNAME
    data.elements.staffname.forEach((elem) => {

        elem.addEventListener('change', async (event) => {

            const tx = await berta.write('settings');

            // prevent empty cells
            event.target.value = event.target?.value || event.target.defaultValue;

            switch (true) {
                case (event.target.value !== event.target.defaultValue):
                    await tx.settings.put({
                        id: event.target.id,
                        value: event.target.value
                    });
                    break;

                default:
                    await tx.settings.delete(event.target.id);
            }
            // prevent resetting on reset
            //elem.setAttribute('value', event.target.value);

            refresh();
        });
    });

    // STAFF
    data.elements.staff.addEventListener('change', async (event) => {
        const user = parseInt(data.elements.participants.value);
        const options = Array.from(event.target);
        const values = options.filter(a => a.selected).map(a => a.value);

        const tx = await berta.write('settings', 'appointments');

        await tx.settings.put({
            id: event.target.id,
            values: values
        });

        for (const option of options) {

            await tx.appointments.updateAnd(
                'user', dberta.between(0, user),
                'staff', option.value, { active: option.selected * 1 }
            )
        }

        validate();
        refresh();
    });

    // PARTICIPANTS
    data.elements.participants.addEventListener('change', async (event) => {

        const user = parseInt(event.target.value);
        const tx = await berta.write('settings', 'appointments');

        await tx.settings.put({
            id: event.target.id,
            value: user
        });

        await tx.appointments.updateAnd('user', dberta.between(0, user), {
            active: 1
        });

        await tx.appointments.updateAnd('user', dberta.between(user + 1, 10), {
            active: 0
        });

        data.elements.staff.dispatchEvent(new Event('change'));
    });

    // APPOINTMENT
    data.elements.appointment.forEach((elem) => {

        elem.pattern = "(?i:MO|DI|MI|DO|FR) [01][0-9]:[0-5][0-9]";

        function onpredefined(event) {
            event.preventDefault();

            elem.value = event.target.value;
            elem.dispatchEvent(new Event('input'));
            elem.dispatchEvent(new Event('change'));
        }

        elem.addEventListener('focusin', async (event) => {
            data.elements.predefinedlist.addEventListener('mousedown', onpredefined);

            const [_, staff, task, user] = event.target.id.split('-');

            const tx = await berta.read('appointments');
            const entries = (
                await tx.appointments.queryOr(
                    'user', dberta.eq(parseInt(user)),
                    'staff', dberta.eq(staff)
                )
            ).filter(entry => entry.active === 1);

            data.elements.predefined.forEach(input => {
                input.disabled = false;

                entries.forEach(entry => {

                    const
                        start1 = getn(input.value),
                        end1 = start1 + durations[task],
                        start2 = entry.start,
                        end2 = start2 + durations[entry.task];

                    if ((start1 < end2) && (start2 < end1)) {
                        input.disabled = true;
                    }
                });
            });
        });

        elem.addEventListener('focusout', (event) => {
            data.elements.predefinedlist.removeEventListener('mousedown', onpredefined);

            data.elements.predefined.forEach(item => {
                item.disabled = true;
            });
        });

        elem.addEventListener('input', (event) => {
            event.target.setCustomValidity('');
        });

        elem.addEventListener('change', async (event) => {
            const [_, staff, task, user] = event.target.id.split('-');
            const tx = await berta.write('appointments');

            switch (true) {
                case (event.target.value && event.target.validity.valid):
                    await tx.appointments.put({
                        id: event.target.id,
                        start: getn(event.target.value),
                        user: parseInt(user),
                        staff: staff,
                        task: task,
                        active: 1
                    });
                    validate();
                    break;

                case (!event.target.value):
                    await tx.appointments.delete(event.target.id);
                    event.target.setCustomValidity('');
                    validate();
                    break;
                default:
                    console.log('error', event.target.value)
            }
        });
    });

    // COMMONTIMES
    const reg = new RegExp(/^(?<start>(?i:MO|DI|MI|DO|FR) [01][0-9]:[0-5][0-9])\s(?<title>.+)/, 'm');

    data.elements.commontimes.addEventListener('change', async (event) => {
        let lines = event.target.value.split(/\n/).filter(x => x.length);

        if (!event.target.value || event.target.validity.valid) {
            const tx = await berta.write('appointments');

            await tx.appointments.deleteAnd('task', dberta.eq('common'));

            for (const n of lines.keys()) {

                if ((m = reg.exec(lines[n])) !== null) {
                    await tx.appointments.add({
                        id: 'appointment-common-' + n,
                        task: 'common',
                        start: getn(m.groups.start),
                        title: m.groups.title,
                        active: 1,
                        user: -1
                    });
                } else {
                    console.error('no match');
                }
            }
        }
    });

    data.elements.commontimes.addEventListener('input', (event) => {

        event.target.setCustomValidity('');

        let lines = event.target.value.split(/\n/)//.filter(x => x.length);

        for (let n = 0; n < lines.length; n++) {
            let tmp = lines.shift();

            if (tmp.length < 3) {
                tmp = tmp.toUpperCase();
            }

            if (!reg.test(tmp)) {

                event.target.setCustomValidity('format');
            }

            lines.push(tmp);
        }

        event.target.value = lines.join('\n');
    });

    // TEMPLATES
    data.elements.templates.addEventListener('change', async (event) => {
        promptTemplateChange.showModal();
    })

    promptTemplateChange.addEventListener('close', async (event) => {

        const tx = await berta.write('appointments', 'settings');

        switch (event.target.returnValue) {
            case 'confirm':
                loadTemplate(data.elements.templates.value);
                refresh();
                break;

            case 'cancel':
                refresh(data.elements.templates.id);
                break;

            default:
                console.error('error')
        }
    });

    // WEEK
    data.elements.week.addEventListener('change', async (event) => {
        const tx = await berta.write('settings');

        await tx.settings.put({
            id: event.target.id,
            valueAsNumber: event.target.valueAsNumber
        });
    });


    // first run
    if (berta.updated) {
        loadTemplate('template-10-default');

        data.elements.week.valueAsNumber = Date.now();
        data.elements.week.dispatchEvent(new Event('change'));
    }

    addEventListener("beforeprint", (event) => { render() });

    validate();
    refresh();


}

addEventListener('load', main);
