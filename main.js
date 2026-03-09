// MIT License

// Copyright (c) 2026 Stephan Cieszynski

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
            settings: "@id,",
            strings: "@id,"
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

        refresh();
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

    const render = async () => {
        const week = new Date(data.elements.week?.valueAsNumber || 0);
        const instant = week.toTemporalInstant();
        const zdt = instant.toZonedDateTimeISO("UTC");
        const date = zdt.toPlainDate();

        const tx = await berta.read('appointments');
        const arr1 = await tx.appointments.where('user', dberta.lt(0));

        preview.querySelectorAll('article').forEach(async (article, nuser) => {

            // cleanup
            article.querySelectorAll('tr').forEach(tr => tr.remove());

            article.querySelector('span').textContent =
                data.elements.username[nuser].value;

            article.querySelectorAll('caption').forEach((caption, i) => {
                caption.textContent = dateOrHoliday(date.add({ days: i }));
            });

            const tables = article.querySelectorAll('table');

            const arr2 = await tx.appointments.queryAnd(
                'user', dberta.eq(nuser),
                'active', dberta.eq(1)
            );

            const arr = arr1.concat(arr2)
                .sort((a, b) => (a.start - b.start));

            arr.forEach((item, i) => {
                const [item1, item2] = arr.slice(i, i + 2);

                if (item2 !== undefined) {
                    const
                        start1 = item1.start,
                        end1 = (item1.dur) ? start1 + item1.dur : start1 + durations[item1.task],
                        start2 = item2.start,
                        end2 = (item2.dur) ? start2 + item2.dur : start2 + durations[item2.task];

                    if ((start1 < end2) && (start2 < end1)) {
                        if (0 > item.user) {
                            return;
                        }

                        arr.splice(i + 1, 1);
                    }
                }

                // daynumber: mon = 0, tue = 1, ...
                const n = Math.trunc(item.start / 1440);

                tables[n].insertAdjacentHTML('beforeend', `
                    <tr>
                        <td>${gett(item.start).substring(3)}&nbsp;Uhr</td>
                        <td>${item.title}</td>
                    </tr>
                `);

            });
        });
    }

    async function refresh(id) {

        const tx = await berta.write('appointments', 'settings', 'strings');

        const strings = await tx.strings.getAll(id);

        for (const item of strings) {
            data.elements[item.id].value = item.value;
        }

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
                    break;

                default:
                    console.error('error', item)
            }
        }

        const appointments = await tx.appointments.getAll(id);
        appointments.sort((a, b) => (a.start - b.start));

        data.elements.appointment.forEach(item => item.value = '');
        data.elements.commontimes.value = '';

        for (const item of appointments) {
            switch (true) {
                case (item.user === -1):
                    data.elements.commontimes.value += `${gett(item.start)} ${item.dur} ${item.title}\n`;
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

        data.elements.commontimes.value = data.elements.commontimes.value.trimEnd();

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

            refresh();
            render();
        });
    });

    // STAFFNAME
    data.elements.staffname.forEach((elem) => {

        elem.addEventListener('change', async (event) => {

            const tx = await berta.write('strings');

            // prevent empty cells
            event.target.value = event.target?.value || event.target.defaultValue;

            switch (true) {
                case (event.target.value !== event.target.defaultValue):
                    await tx.strings.put({
                        id: event.target.id,
                        value: event.target.value
                    });
                    break;

                default:
                    await tx.strings.delete(event.target.id);
            }

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
                        title: title[task],
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

            render();
        });
    });

    // COMMONTIMES
    const reg = new RegExp(/^(?<start>(?i:MO|DI|MI|DO|FR) [01][0-9]:[0-5][0-9]) (?<dur>[0-9]+)\s(?<title>.+)\n*/, '');

    data.elements.commontimes.addEventListener('change', async (event) => {

        let lines = event.target.value.split(/\n/).filter(x => x.length);

        if (!event.target.value || event.target.validity.valid) {
            const tx = await berta.write('appointments');

            await tx.appointments.deleteAnd('task', dberta.eq('common'));

            for (const n of lines.keys()) {

                if ((m = reg.exec(lines[n])) !== null) {
                    await tx.appointments.add({
                        id: 'appointment-common-' + n,
                        dur: parseInt(m.groups.dur),
                        task: 'common',
                        start: getn(m.groups.start),
                        title: m.groups.title,
                        active: 1,
                        user: -1
                    });

                    refresh();
                } else {
                    console.error('no match');
                }
            }
        }
    });

    data.elements.commontimes.addEventListener('input', (event) => {

        event.target.setCustomValidity('');

        const selection = Math.min(event.target.selectionStart, event.target.selectionEnd);

        let lines = event.target.value.split(/\n/);

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
        event.target.setSelectionRange(selection, selection);
    });

    // TEMPLATES
    data.elements.templates.addEventListener('change', changeevent => {
        dlgconfirm.addEventListener('close', async (event) => {
            switch (event.target.returnValue) {
                case 'confirm':
                    loadTemplate(changeevent.target.value);
                    break;
                case 'cancel':
                default:
                    refresh();
            }
        }, { once: true })
        dlgconfirm.showModal();
    });

    // WEEK
    data.elements.week.addEventListener('change', async (event) => {
        const tx = await berta.write('settings');
        /* console.log(event.target.id) */
        await tx.settings.put({
            id: event.target.id,
            valueAsNumber: event.target.valueAsNumber
        });
        render();
    });

    // FILEMENU
    dlgfile.addEventListener('close', event => {

        switch (event.target.returnValue) {
            case 'open':
                openfile();
                break;
            case 'save':
                savefile();
                break;
            case 'print':
                print();
                break;
            case 'close':
                close();
                break;
        }

        // reset returnValue
        event.target.returnValue = '';
    });

    // FILEHANDLING
    const pickerOpts = {
        types: [
            {
                description: "EMRP Files",
                accept: {
                    "text/json": [".emrp"],
                },
            },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
    };

    const savefile = async () => {

        try {
            const result = {}
            const fileHandle = await window.showSaveFilePicker(pickerOpts);

            const tx = await berta.read('settings', 'appointments');
            result.settings = await tx.settings.getAll();
            result.appointments = await tx.appointments.getAll();

            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(result));
            await writable.close();

        } catch (ex) {
            switch (ex.name) {
                case 'AbortError':
                    break;
                default:
                    console.dir(ex)
            }
        }
    }

    const readfile = async (fileHandle) => {

        try {
            const file = await fileHandle.getFile();
            const json = await file.text();
            const obj = JSON.parse(json);

            const tx = await berta.write('settings', 'appointments');
            await tx.appointments.clear();
            await tx.settings.clear();

            for (const item of obj.settings) {
                await tx.settings.put(item);
            }

            for (const item of obj.appointments) {
                await tx.appointments.put(item);
            }

            refresh();
            validate();

        } catch (ex) {
            console.error(ex)
        }
    }

    const openfile = async () => {

        try {
            const [fileHandle] = await window.showOpenFilePicker(pickerOpts);

            readfile(fileHandle);

        } catch (ex) {
            switch (ex.name) {
                case 'AbortError':
                    break;
                default:
                    console.error(ex)
            }
        }
    }

    window.launchQueue.setConsumer(launchParams => {
        const [fileHandle] = launchParams.files;

        if (fileHandle) {
            readfile(fileHandle);
        }
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

    render();
}

addEventListener('load', main);

try {
    navigator.serviceWorker.register("sw.js")
        .then(registration => {
            console.log(registration)
        });
} catch (error) {
    console.error(`Registration failed with ${error}`);
}
