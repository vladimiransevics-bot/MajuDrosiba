/**
 * Shared price-display helper.
 * DB stores prices EXCLUDING VAT. This helper adds 21% Latvian VAT at display
 * time when the user has the "Cena ar PVN" toggle on (default).
 * Selection persists via localStorage and propagates across pages.
 */
window.PriceFmt = {
  VAT_RATE: 0.21,

  isWithVat() {
    const v = localStorage.getItem('vat_included');
    return v === null ? true : v === '1';
  },

  setWithVat(on) {
    localStorage.setItem('vat_included', on ? '1' : '0');
    document.dispatchEvent(new Event('vatChanged'));
  },

  display(raw) {
    return this.isWithVat() ? raw * (1 + this.VAT_RATE) : raw;
  },

  format(raw) {
    return this.display(raw).toFixed(2) + ' €';
  },
};
