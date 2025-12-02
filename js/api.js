import CONFIG from './config.js';

/**
 * Fetches AQI data from the MOENV API.
 * @returns {Promise<Array>} Array of station data objects.
 */
export async function fetchAQIData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const url = `${CONFIG.API_URL}?api_key=${CONFIG.API_KEY}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.records;
    } catch (error) {
        console.error('Error fetching AQI data:', error);
        throw error;
    }
}

/**
 * Determines the AQI status and color based on the value.
 * @param {number} aqi - The AQI value.
 * @returns {object} Object containing status text, color class (Tailwind), and hex code.
 */
export function getAQIStatus(aqi) {
    const val = parseInt(aqi, 10);

    if (isNaN(val)) return { status: '無資料', color: 'gray-400', hex: '#9ca3af', class: 'bg-gray-400' };

    if (val <= 50) return { status: '良好', color: 'aqi-good', hex: '#009866', class: 'bg-[#009866]' };
    if (val <= 100) return { status: '普通', color: 'aqi-moderate', hex: '#FFDE33', class: 'bg-[#FFDE33]' };
    if (val <= 150) return { status: '對敏感族群不健康', color: 'aqi-sensitive', hex: '#FF9933', class: 'bg-[#FF9933]' };
    if (val <= 200) return { status: '不健康', color: 'aqi-unhealthy', hex: '#CC0033', class: 'bg-[#CC0033]' };
    if (val <= 300) return { status: '非常不健康', color: 'aqi-very_unhealthy', hex: '#660099', class: 'bg-[#660099]' };
    return { status: '危害', color: 'aqi-hazardous', hex: '#7E0023', class: 'bg-[#7E0023]' };
}

/**
 * Returns health advice based on AQI.
 * @param {number} aqi 
 */
export function getHealthAdvice(aqi) {
    const val = parseInt(aqi, 10);
    if (isNaN(val)) return '目前無相關建議。';

    if (val <= 50) return '空氣品質良好，可以正常戶外活動。';
    if (val <= 100) return '空氣品質普通；極特殊敏感族群建議注意可能產生的咳嗽或呼吸急促症狀，但仍可正常戶外活動。';
    if (val <= 150) return '空氣污染物可能會對敏感族群的健康造成影響，但是對一般大眾的影響不明顯。';
    if (val <= 200) return '對所有人的健康開始產生影響，對於敏感族群可能產生較嚴重的健康影響。';
    if (val <= 300) return '健康警報：所有人都可能產生較嚴重的健康影響。';
    return '健康威脅達到緊急，所有人都可能受到影響。';
}
