export const isDifferenceLessThanOneDay = (date1: Date, date2: Date) => {
    const oneDay: number = 24 * 60 * 60 * 1000; // One day in milliseconds
    const diff: number = Math.abs(date1.getTime() - date2.getTime()); // Absolute difference in milliseconds
    return diff < oneDay;
};
