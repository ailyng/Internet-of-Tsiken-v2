// Device Lockout Management Functions

// Check if the login is currently locked out
function checkLoginLockout(deviceId, lockoutData) {
    const lockoutInfo = lockoutData[deviceId];
    if (!lockoutInfo) return false;
    return lockoutInfo.loginAttempts >= lockoutInfo.maxLoginAttempts;
}

// Check if the OTP is currently locked out
function checkOTPLockout(deviceId, lockoutData) {
    const lockoutInfo = lockoutData[deviceId];
    if (!lockoutInfo) return false;
    return lockoutInfo.otpAttempts >= lockoutInfo.maxOTPAttempts;
}

// Increment the login attempts for a specific device
function incrementLoginAttempts(deviceId, lockoutData) {
    if (!lockoutData[deviceId]) {
        lockoutData[deviceId] = {loginAttempts: 0, otpAttempts: 0, lockoutTime: null};
    }
    lockoutData[deviceId].loginAttempts++;
}

// Increment the OTP attempts for a specific device
function incrementOTPAttempts(deviceId, lockoutData) {
    if (!lockoutData[deviceId]) {
        lockoutData[deviceId] = {loginAttempts: 0, otpAttempts: 0, lockoutTime: null};
    }
    lockoutData[deviceId].otpAttempts++;
}

// Lock out login for a device
function lockoutLoginOnDevice(deviceId, lockoutData, duration) {
    lockoutData[deviceId].lockoutTime = Date.now() + duration;
}

// Lock out OTP for a device
function lockoutOTPOnDevice(deviceId, lockoutData, duration) {
    lockoutData[deviceId].lockoutTime = Date.now() + duration;
}

// Reset the login attempts for a specific device
function resetLoginAttempts(deviceId, lockoutData) {
    if (lockoutData[deviceId]) {
        lockoutData[deviceId].loginAttempts = 0;
    }
}

// Reset the OTP attempts for a specific device
function resetOTPAttempts(deviceId, lockoutData) {
    if (lockoutData[deviceId]) {
        lockoutData[deviceId].otpAttempts = 0;
    }
}

// Format lockout time to a readable string
function formatLockoutTime(expirationTime) {
    const date = new Date(expirationTime);
    return date.toISOString(); // Returns in ISO format
}

module.exports = {
    checkLoginLockout,
    checkOTPLockout,
    incrementLoginAttempts,
    incrementOTPAttempts,
    lockoutLoginOnDevice,
    lockoutOTPOnDevice,
    resetLoginAttempts,
    resetOTPAttempts,
    formatLockoutTime
};