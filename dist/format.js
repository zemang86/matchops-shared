// Display formatting shared by both apps.
export const formatNumber = (num) => {
    if (num >= 1_000_000)
        return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)
        return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
};
export const formatDate = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
export const formatDateTime = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};
