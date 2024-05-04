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
    const ticketInfo = [];
    for (const ticket of tickets) {
        ticketInfo.push([ticket["id"], ticket["custom_fields"][0]["value"]]);
    }
    return ticketInfo;
}

async function getUPSTrackingStatus() {
    const trackingNumbers = await getTicketSearchResults();
    console.log(trackingNumbers);
}

getUPSTrackingStatus();


