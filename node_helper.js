var NodeHelper = require("node_helper");
var https = require("https");
var fs = require("fs");
var path = require("path");

module.exports = NodeHelper.create({
    start: function() {
        console.log("MMM-FearAndGreedIndex helper started...");
        this.scheduleUpdate();
        this.scheduleCryptoUpdate();
    },
    
    socketNotificationReceived: function(notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            console.log("[MMM-FearAndGreedIndex] Configuration received.", this.config);
            this.scheduleUpdate(); // Update traditional index
            this.scheduleCryptoUpdate(); // Update crypto index
        }
    },

    scheduleUpdate: function() {
        var self = this;
        self.sendIndexData();
        setInterval(function() {
            self.sendIndexData();
        }, this.config.updateInterval);
    },

    sendIndexData: function() {
        var filepath = path.resolve(__dirname, this.config.filename);
        console.log("Attempting to send INDEX_DATA from:", filepath);
        if (fs.existsSync(filepath)) {
            fs.readFile(filepath, (err, data) => {
                if (err) {
                    console.error("Error reading data.json:", err);
                    return;
                }
                console.log("Sending INDEX_DATA:", JSON.parse(data));
                this.sendSocketNotification("INDEX_DATA", JSON.parse(data));
            });
        } else {
            console.log("data.json not found at:", filepath);
        }
    },
    
    scheduleCryptoUpdate: function() {
        var self = this;
        self.fetchCryptoIndex();
        setInterval(function() {
            self.fetchCryptoIndex();
        }, this.config.updateInterval);
    },
    
    fetchCryptoIndex: function() {
        var self = this;
        console.log("Attempting to fetch crypto index data.");
        var url = "https://api.alternative.me/fng/";
        
        https.get(url, (response) => {
            let data = '';

            // Handle data chunks as they come in
            response.on('data', (chunk) => {
                data += chunk;
            });

            // When all data has been received
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData && parsedData.data && parsedData.data.length > 0) {
                        var indexData = parsedData.data[0];
                        console.log("Sending CRYPTO_INDEX_DATA:", indexData);
                        self.sendSocketNotification("CRYPTO_INDEX_DATA", indexData);
                    } else {
                        console.error("Unexpected crypto index data format:", parsedData);
                    }
                } catch (error) {
                    console.error("Error parsing crypto index data:", error);
                }
            });
        }).on('error', (error) => {
            console.error("Error fetching crypto index:", error);
        });
    },
});
