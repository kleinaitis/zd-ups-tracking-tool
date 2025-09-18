require('dotenv').config();


async function generateUPSToken() {

    const formData = {
        grant_type: 'client_credentials'
    };

    const response = await fetch('https://onlinetools.ups.com/security/v1/oauth/token', {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + btoa(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`)
        },
        body: new URLSearchParams(formData).toString()

    });
    const data = await response.json();
    return data["access_token"];
}


async function getTicketSearchResults() {
    const query = encodeURIComponent(`${process.env.CUSTOM_FIELD_QUERY} status<solved`);

    const response = await fetch(`https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search?query=${query}`, {
        method: "GET",
        redirect: "follow",
        headers: {
            "Authorization": `Basic ${process.env.ZENDESK_CREDENTIALS}`,
            "Accept": "application/json",
        },
    });

    const data = await response.json();
    const tickets = data.results;
    const parsedTickets = []
    const zendeskCustomFieldID = parseInt(process.env.CUSTOM_FIELD_ID);

    for (const ticket of tickets) {
        let shipmentInformation = new Map();
        for (const customField of ticket.custom_fields) {
            if (customField.id === zendeskCustomFieldID) {
                // Removes commas and divides string based on spaces and new lines
                let trackingNumbers = customField.value.replace(/,/g, '').split(/\s|\n/)
                trackingNumbers.forEach((id) => shipmentInformation.set(id, ''));
                break
            }
        }
        let parsedTicket = {
            ticketID: ticket["id"],
            shipmentInformation: shipmentInformation,
        }
        parsedTickets.push(parsedTicket)
    }
    return parsedTickets;
}

async function getUPSTrackingStatus() {
    const ticketList = await getTicketSearchResults();
    const upsAccessToken = await generateUPSToken();


    for (const ticket of ticketList) {
        for (const trackingID of ticket.shipmentInformation.keys())
            try {
                const response = await fetch(`https://onlinetools.ups.com/api/track/v1/details/${trackingID}`, {
                    method: "GET",
                    redirect: "follow",
                    headers: {
                        transId: '1234',
                        transactionSrc: 'testing',
                        Authorization: `Bearer ${upsAccessToken}`
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    ticket.shipmentInformation.set(trackingID, data.trackResponse.shipment[0].package[0].currentStatus.description);
                } else {
                    ticketList.pop()
                }
            } catch (error) {
                console.error('Error fetching UPS API:', error);
            }
    }
    return ticketList;
}

async function updateZendeskTicket() {
    const ticketList = await getUPSTrackingStatus();
    const results = [];

    for (const ticket of ticketList) {

        let custom_status = [];
        let ticketBody = [];

        // Map.forEach parameters are v,k rather than k,v
        ticket.shipmentInformation.forEach((shipmentStatus, trackingNumber) => {
            if (shipmentStatus !== 'Delivered') {
                custom_status.push(`\n${trackingNumber}`)
            }
            ticketBody.push(`\n${trackingNumber} is "${shipmentStatus}"`)
        })

        const body = JSON.stringify({
            "ticket": {
                "comment": {
                    "body": `UPS Tracking Tool: ${ticketBody.toString()}`,
                    "public": false
                },
                "custom_fields": [{"id": `${process.env.CUSTOM_FIELD_ID}`, "value":`${custom_status.toString()}`}],
                "status": "open"
            }
        })

        try {
            const response = await fetch(`https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticket.ticketID}`, {
                method: "PUT",
                redirect: "follow",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${process.env.ZENDESK_CREDENTIALS}`,
                    "Accept": "application/json",
                },
                body: body
            });

            if (!response.ok) {
                console.error(`Failed to update ticket ${ticket.ticketID}. Status: ${response.status}`);
            } else {
                const data = await response.json();
                results.push(data); // Collect the results for AWS console
            }
        } catch (error) {
            console.error(`Error updating ticket ${ticket.ticketID}:`, error.message);
        }
    }
    return results;
}

module.exports = { updateZendeskTicket };
