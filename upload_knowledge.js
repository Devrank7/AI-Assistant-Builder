const fs = require('fs');

async function uploadKnowledge() {
    const text = fs.readFileSync('.agent/widget-builder/clients/bruno/knowledge/context.md', 'utf8');

    try {
        const response = await fetch('http://localhost:3000/api/knowledge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'admin_token=admin-secret-2026'
            },
            body: JSON.stringify({
                clientId: 'bruno',
                text: text,
                source: 'widget-builder'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Knowledge uploaded successfully:', data);
    } catch (error) {
        console.error('Error uploading knowledge:', error);
        process.exit(1);
    }
}

uploadKnowledge();
