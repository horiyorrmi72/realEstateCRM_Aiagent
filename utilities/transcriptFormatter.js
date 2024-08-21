const TranscriptParser = {
    parseTranscriptToArray: function(transcript) {
        if (!transcript || typeof transcript !== "string") {
            return [];
        }

        const messages = transcript.split("\n");
        const transcriptArray = [];
        let currentSpeaker = null;
        let currentMessage = "";

        for (const msg of messages) {
            const delimiterIndex = msg.indexOf(":");
            if (delimiterIndex !== -1) {
                const speaker = msg.substring(0, delimiterIndex).trim();
                const message = msg.substring(delimiterIndex + 1).trim();

                if (currentSpeaker && currentSpeaker !== speaker) {
                    transcriptArray.push({
                        speaker: currentSpeaker,
                        message: currentMessage.trim(),
                    });
                    currentMessage = "";
                }

                currentSpeaker = speaker;
                currentMessage += message;
            }
        }

        // Push the last message if any
        if (currentSpeaker) {
            transcriptArray.push({
                speaker: currentSpeaker,
                message: currentMessage.trim(),
            });
        }

        return transcriptArray;
    }
};




module.exports = {
    TranscriptParser
};

