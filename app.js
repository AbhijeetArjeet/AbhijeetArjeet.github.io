async function startNFCScan() {
    try{
        const nfcStatus = await navigator.permissions.query({name: "nfc"});

        if(nfcStatus.state==="granted"){
            console.log("NFC Permission already granted");
            const reader=new NDEFReader();
            await reader.scan();
            console.log("Scanning for NFC tags...");
            alert("NFC scan started. Tap an NFC tag to read.");
            reader.onreading = event => {
                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    console.log("Record type:", record.recordType);
                    console.log("MIME type:", record.mediaType);
                    console.log("Record id:", record.id);
                    console.log("Data:", decoder.decode(record.data));
                    alert(`NFC Tag Read:\nType: ${record.recordType}\nMIME: ${record.mediaType}\nID: ${record.id}\nData: ${decoder.decode(record.data)}`);
                }
            };
            reader.onerror = event => {
                console.error("Error reading NFC tag:", event);
                alert("Error reading NFC tag. See console for details.");
            };
        } else if(nfcStatus.state==="prompt"){
            console.log("NFC Permission needs to be requested")
            const reader = new NDEFReader();
            await reader.scan()
            console.log("NFC Permission requested. User should see a prompt");
            alert("NFC scan started. Tap an NFC tag to read.");
            reader.onreading = event => {
                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    console.log("Record type:", record.recordType);
                    console.log("MIME type:", record.mediaType);
                    console.log("Record id:", record.id);
                    console.log("Data:", decoder.decode(record.data));
                    alert(`NFC Tag Read:\nType: ${record.recordType}\nMIME: ${record.mediaType}\nID: ${record.id}\nData: ${decoder.decode(record.data)}`);
                }
            };
            reader.onerror = event => {
                console.error("Error reading NFC tag:", event);
                alert("Error reading NFC tag. See console for details.");
            }; 
        } else {
            console.log("NFC Permission denied by the user.")
        }
    } catch(error) {
        alert("NFC is not supported on this device or browser.");
        console.error("Error accessing NFC:", error);
    }
}