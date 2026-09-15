"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "mr" | "en";

// Marathi (default) + English UI strings for the vendor-facing app.
// Chosen to avoid pre-base i-matra (ि) for the PDF renderer, which does no
// complex shaping; the browser renders all of it correctly.
export const STRINGS = {
  mr: {
    appName: "OrderApp",
    tagline: "घेऊन जा — भाज्या, इंग्रजी भाज्या व फळे",
    orderOpen: "ऑर्डर चालू आहे",
    orderClosed: "ऑर्डर बंद आहे",
    closesIn: "बंद होण्यास —",
    opensIn: "सुरू होण्यास —",
    editUntilClose: "विंडो बंद होईपर्यंत ऑर्डर बदलू शकता. विंडो बंद झाल्यावर डिलिव्हरी.",
    deliveryAfter: "सर्व ऑर्डर विंडो बंद झाल्यावर एकत्रित पोहोचवल्या जातात.",
    nextWindow: "पुढील विंडो:",
    deliveryNoteLabel: "डिलिव्हरी सूचना:",
    profileInfo: "विंडो बंद झाल्यावर ऑर्डर तुमच्या पत्त्यावर पोहोचवल्या जातात. पेमेंट डिलिव्हरीवेळी रोख स्वरूपात घेतले जाते.",
    closesAt: "बंद",
    opensAt: "सुरू",
    search: "भाज्या व फळे शोधा…",
    all: "सर्व",
    catLocal: "भाज्या",
    catEnglish: "इंग्रजी भाज्या",
    catFruits: "फळे",
    newOrder: "नवीन ऑर्डर",
    inOrder: "ऑर्डरमध्ये",
    reviewOrder: "ऑर्डर पाहा",
    itemsSelected: "वस्तू निवडल्या",
    saveOrder: "ऑर्डर सेव्ह करा",
    saving: "सेव्ह होत आहे…",
    orderSaved: "ऑर्डर सेव्ह झाला — विंडो बंद होईपर्यंत बदलता येईल.",
    windowClosed: "ऑर्डरिंग विंडो बंद आहे.",
    cart: "कार्ट",
    orders: "ऑर्डर",
    profile: "प्रोफाइल",
    order: "ऑर्डर",
    myOrders: "माझे ऑर्डर",
    total: "एकूण",
    payOnDelivery: "डिलिव्हरीवेळी रोख",
    current: "सध्याचा",
    invoicePdf: "बिल PDF",
    repeatInCart: "कार्टमध्ये घ्या",
    noOrders: "अद्याप ऑर्डर नाही.",
    emptyCart: "कार्ट रिकामा आहे.",
    browse: "माल पाहा",
    clear: "पुसा",
    noteFromSupplier: "सप्लायरची टिप:",
    windowLabel: "विंडो",
    signOut: "बाहेर पडा",
    deliveryAddress: "डिलिव्हरी पत्ता",
    contactPerson: "संपर्क व्यक्ती",
    phone: "फोन",
    email: "ईमेल",
    noProducts: "कोणतीही वस्तू सापडली नाही.",
    items: "वस्तू",
  },
  en: {
    appName: "OrderApp",
    tagline: "Wholesale vegetables, English vegetables & fruits",
    orderOpen: "Ordering is open",
    orderClosed: "Ordering is closed",
    closesIn: "closes in",
    opensIn: "opens in",
    editUntilClose:
      "Edit your order freely until the window closes. Delivery follows after close.",
    deliveryAfter:
      "All orders in the window are delivered together after it closes.",
    nextWindow: "Next window:",
    deliveryNoteLabel: "Delivery note:",
    profileInfo: "Orders are delivered to your saved address after each window closes. Payment is collected on delivery.",
    closesAt: "closes",
    opensAt: "opens",
    search: "Search vegetables & fruits…",
    all: "All",
    catLocal: "Vegetables",
    catEnglish: "English Veg",
    catFruits: "Fruits",
    newOrder: "New order",
    inOrder: "In order",
    reviewOrder: "Review order",
    itemsSelected: "items selected",
    saveOrder: "Save order",
    saving: "Saving…",
    orderSaved: "Order saved — you can keep editing until the window closes.",
    windowClosed: "The ordering window is closed.",
    cart: "Cart",
    orders: "Orders",
    profile: "Profile",
    order: "Order",
    myOrders: "My orders",
    total: "Total",
    payOnDelivery: "pay on delivery",
    current: "Current",
    invoicePdf: "Invoice PDF",
    repeatInCart: "Repeat in cart",
    noOrders: "No orders yet.",
    emptyCart: "Your order is empty.",
    browse: "Browse products",
    clear: "Clear",
    noteFromSupplier: "Note from supplier:",
    windowLabel: "window",
    signOut: "Sign out",
    deliveryAddress: "Delivery address",
    contactPerson: "Contact person",
    phone: "Phone",
    email: "Email",
    noProducts: "No products match.",
    items: "items",
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
}>({ lang: "mr", setLang: () => {}, t: (k) => STRINGS.mr[k] });

export const useLang = () => useContext(LangContext);

const STORAGE_KEY = "gg-lang";

export function LangProvider({
  defaultLang,
  children,
}: {
  defaultLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "mr") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  const t = (k: StringKey) => STRINGS[lang][k];

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}
