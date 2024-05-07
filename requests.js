require('dotenv').config();

async function getTicketSearchResults() {
    const query = encodeURIComponent(process.env.CUSTOM_FIELD)

    const response = await fetch(`https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search?query=${query}`, {
        method: "GET",
        redirect: "follow",
        headers: {
            "Authorization": `Basic ${process.env.ZENDESK_CREDENTIALS}`,
            "Accept": "application/json",
        },
    });

    const responseData = await response.json();
    const tickets = responseData.results;
    const ticketInfo = new Map();
    for (const ticket of tickets) {
        ticketInfo.set(ticket["id"], ticket["custom_fields"][0]["value"]);
    }
    return ticketInfo;
}

async function getUPSTrackingStatus() {
    const trackingNumbers = await getTicketSearchResults();

    for (const [ticketID,trackingID] of trackingNumbers) {
        const response = await fetch(`https://onlinetools.ups.com/api/track/v1/details/${trackingID}`, {
            method: "GET",
            redirect: "follow",
            headers: {
                transId: '1234',
                transactionSrc: 'testing',
                Authorization: `Bearer ${process.env.UPS_ACCESS_TOKEN}`
            },
        });
        const data = await response.json();
        const ticketStatus = data.trackResponse.shipment[0].package[0].currentStatus.description
        console.log(ticketID, ticketStatus)
    }
}

getUPSTrackingStatus();


