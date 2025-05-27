const axios = require('axios');

const GOOGLE_APPS_SCRIPT_WEB_APP_URL = process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL;

exports.handler = async function(event, context) {
    if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL) {
        console.error("ERROR: GOOGLE_APPS_SCRIPT_WEB_APP_URL environment variable is not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Server configuration error: Apps Script URL is missing. Please set the GOOGLE_APPS_SCRIPT_WEB_APP_URL environment variable in your Netlify dashboard."
            })
        };
    }
  
    let appsScriptRequestUrl = GOOGLE_APPS_SCRIPT_WEB_APP_URL;
    const queryParams = event.queryStringParameters;

    if (queryParams && Object.keys(queryParams).length > 0) {
        const queryString = new URLSearchParams(queryParams).toString();
        appsScriptRequestUrl += `?${queryString}`;
    }

    console.log(`Proxying request to Apps Script: ${appsScriptRequestUrl}`);

    try {
        const response = await axios.get(appsScriptRequestUrl);

        const jsonpString = response.data;

        const startIndex = jsonpString.indexOf('(');
        const endIndex = jsonpString.lastIndexOf(')');
        let extractedJsonString = '';

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            extractedJsonString = jsonpString.substring(startIndex + 1, endIndex);
        } else {
            console.warn("Unexpected JSONP format from Apps Script. Attempting to parse full response.");
            extractedJsonString = jsonpString;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(extractedJsonString);
        } catch (parseError) {
            console.error("Failed to parse JSON from extracted Apps Script response:", parseError);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Failed to parse data received from Google Apps Script."
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(parsedData)
        };

    } catch (error) {
        console.error("Error fetching data from Google Apps Script:", error.message);
        if (error.response) {
            console.error("Apps Script Response Status:", error.response.status);
            console.error("Apps Script Response Data:", error.response.data);
        }

        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify({
                error: "Failed to retrieve data from the backend.",
                
                details: error.message
            })
        };
    }
};
