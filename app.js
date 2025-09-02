async function startNFCScan() {
    try{
        const nfcStatus = await navigator.permissions.query({name: "nfc"});

        if(nfcStatus.state==="granted"){
            console.log("NFC Permission already granted");
            const reader=new NDEFReader();
            await reader.scan();
            console.log("Scanning for NFC tags...");
        } else if(nfcStatus.state==="prompt"){
            console.log("NFC Permission needs to be requested")
            const reader = new NDEFReader();
            await reader.scan()
            console.log("NFC Permission requested. User should see a prompt");
        } else {
            console.log("NFC Permission denied by the user.")
        }
    } catch(error) {
        console.error("Error accessing NFC:", error);
    }
}