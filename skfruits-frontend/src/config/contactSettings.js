/** Single source of truth for Contact Us page & footer contact details. */
export const CONTACT_SETTINGS = {
  phoneDisplay: "+91 91165 46255",
  phoneE164: "919116546255",
  email: "Skfruitsbhilwara@gmail.com",
  businessAddress: "Shop no. 5, Suchna Kendra, Dil Se SK Fruits, Bhilwara, Rajasthan 311001",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Dil+Se+SK+Fruits+Bhilwara+Rajasthan+311001",
  stores: [
    {
      n: 1,
      lines: ["Shop no. 5, Suchna Kendra", "Dil Se SK Fruits", "Bhilwara, Rajasthan 311001"],
      thumb: "/images/store/IMG_9271.jpg",
    },
    {
      n: 2,
      lines: ["Krashi Upaj Mandi", "Shop No. 93, 94", "Bhilwara, Rajasthan 311001"],
      thumb: "/images/store/IMG_9274.jpg",
    },
  ],
  social: [
    {
      name: "Instagram",
      handle: "dilseskfruits",
      cta: "Follow for daily fruit stories",
      href: "https://www.instagram.com/invites/contact/?utm_source=ig_contact_invite&utm_medium=copy_link&utm_content=xm9qyjh",
      gradient: true,
    },
    {
      name: "Facebook",
      handle: "Dil Se Sk Fruits",
      cta: "Like our page for offers & updates",
      href: "https://www.facebook.com/share/1GsP7HqSMy/",
      gradient: false,
    },
  ],
};

export function getContactSettings() {
  return CONTACT_SETTINGS;
}

export function getTelHref(phoneE164 = CONTACT_SETTINGS.phoneE164) {
  const digits = phoneE164.replace(/\D/g, "");
  return `tel:+${digits}`;
}

export function getMailtoHref(email = CONTACT_SETTINGS.email) {
  return `mailto:${email}`;
}
