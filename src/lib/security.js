export const hashPIN = async (pin) => {
    const msgUint8 = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPIN = async (inputPin, storedHash) => {
    const inputHash = await hashPIN(inputPin);
    return inputHash === storedHash;
};
