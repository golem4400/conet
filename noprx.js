const axios = require('axios');
const fs = require('fs').promises;
const colors = require('colors');

class MiningManager {
    log(msg, color) {
        console.log(`[${new Date().toISOString()}] ${msg[color]}`);
    }

    async readDataFile(filePath) {
        const data = await fs.readFile(filePath, 'utf8');
        return data.trim().split('\n').map(line => {
            const [walletAddress, signMessage] = line.replace('\r', '').split('|');
            return {
                message: JSON.stringify({ walletAddress: walletAddress.trim() }),
                signMessage: signMessage.trim()
            };
        });
    }

    async makeRequest(account, index, maxRetries = 50, retryDelay = 9000) {
        const url = 'https://api.conet.network/api/startMining';

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios.post(url, account, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    responseType: 'text'
                });
    
                const dataLines = response.data.split('\n');
    
                const results = [];
                for (const line of dataLines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            results.push(`Tài khoản ${index + 1} - Tốc độ /s : ${json.rate} | Online ${json.online}`);
                        } catch (error) {
                            results.push(`Tài khoản ${index + 1} - Lỗi khi phân tích cú pháp JSON: ${error.message}`);
                        }
                    }
                }
    
                return results;
            } catch (error) {
                if (attempt < maxRetries) {
                    this.log(`Tài khoản ${index + 1} - Lỗi khi gửi yêu cầu (lần ${attempt}): ${error.message}. Thử lại sau ${retryDelay/1000} giây...`, 'yellow');
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    return [`Tài khoản ${index + 1} - Lỗi khi gửi yêu cầu sau ${maxRetries} lần thử: ${error.message}`];
                }
            }
        }
    }

    async main() {
        try {
            const accounts = await this.readDataFile('data.txt');
            
            this.log(`Bắt đầu mining cho ${accounts.length} tài khoản...`, 'green');
    
            while (true) { 
                const promises = accounts.map(async (account, index) => {
                    try {
                        const results = await this.makeRequest(account, index);
                        results.forEach(result => this.log(result, 'yellow'));
                    } catch (error) {
                        this.log(`Lỗi với tài khoản ${index + 1}: ${error.message}`, 'red');
                    }
                });
    
                await Promise.all(promises);
                
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            this.log(`Lỗi chung: ${error.message}`, 
