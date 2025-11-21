const OTP_LENGTH = 6;
const ALPHABET = '0123456789';

/**
 * Generate a random OTP
 * @returns {string} The generated OTP
 */
function generateOTP() {
    let otp = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * ALPHABET.length);
        otp += ALPHABET[randomIndex];
    }
    return otp;
}

/**
 * Verify if the provided OTP matches the expected OTP
 * @param {string} inputOTP The OTP to verify
 * @param {string} expectedOTP The expected OTP
 * @returns {boolean} True if the OTPs match, false otherwise
 */
function verifyOTP(inputOTP, expectedOTP) {
    return inputOTP === expectedOTP;
}

module.exports = { generateOTP, verifyOTP };