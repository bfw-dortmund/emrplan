// FILEHANDLING
if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
    console.log('launchQueue OK')

    launchQueue.setConsumer(launchParams => {
        console.dir(launchParams)
    });
}

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

/* const savefile = async () => {

    try {
        const fileHandle = await window.showSaveFilePicker(pickerOpts);

        const writable = await fileHandle.createWritable();
        await writable.write("contents");
        await writable.close();

    } catch (ex) {
        switch (ex.name) {
            case 'AbortError':
                break;
            default:
                console.dir(ex)
        }
    }
} */

/* const openfile = async () => {


    const [fileHandle] = await window.showOpenFilePicker(pickerOpts);
    // get file contents
    const fileData = await fileHandle.getFile();
} */