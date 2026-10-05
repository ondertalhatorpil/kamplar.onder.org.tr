import { Mountain, Waves } from 'lucide-react';

// Shared between the homepage cards and the camp center detail page, so the
// two stay in sync. `galleryFolder` points at a public/ directory the admin
// drops photos into by hand — see gallery image naming convention on the
// detail page (CampCenterDetailPage.jsx).
//
// Location fields (the "Konum" section on the detail page stays hidden until
// at least one of them is filled):
//   address     — address text shown next to the map
//   mapsUrl     — Google Maps "Paylaş > Bağlantıyı kopyala" link (maps.app.goo.gl/...)
//   mapEmbedUrl — optional: the src="..." value from Google Maps
//                 "Paylaş > Harita yerleştir". Without it the map is embedded
//                 by searching the address.
export const CAMP_CENTERS = [
  {
    id: 1,
    slug: 'bursa',
    icon: Mountain,
    name: 'Bursa Kamp Merkezi',
    location: "Bursa'nın Merkezinde",
    capacity: '78 Kişi',
    desc: 'Doğal güzellikler içinde, çam kokuları eşliğinde modern bir tesis. Geniş alanları ve doğayla iç içe konumuyla grupların vazgeçilmez noktası.',
    gradient: 'from-red-800 to-red-950',
    meals: [{ label: 'Kahvaltı', tone: 'light' }],
    galleryFolder: '/yurtlar/bursa',
    address: '',
    mapsUrl: '',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3599.7491130775197!2d29.066212699999998!3d40.1850635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14ca3d4cfa15a6b1%3A0x6f4ae2599149c2ff!2zw5ZaRUwgw5ZOREVSIEJVUlNBIMOWxJ5SRU5DxLAgWVVSRFU!5e1!3m2!1str!2str!4v1790584644167!5m2!1str!2str',
  },
  {
    id: 2,
    slug: 'buyukcekmece',
    icon: Waves,
    name: 'Büyükçekmece Kamp Merkezi',
    location: "İstanbul'un Batısında",
    capacity: '48 Kişi',
    desc: "İstanbul'un batısında, göl esintisi eşliğinde huzur dolu bir kamp alanı. Hem kahvaltı hem akşam yemeği ile tam donanımlı konaklama.",
    gradient: 'from-red-900 to-red-950',
    meals: [{ label: 'Kahvaltı', tone: 'light' }, { label: 'Akşam Yemeği', tone: 'dark' }],
    galleryFolder: '/yurtlar/buyukcekmece',
    address: '',
    mapsUrl: '',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d227526.02029682783!2d28.24499130249023!3d41.01941239249448!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14b55de8065c2c45%3A0xc0b07d4777acb3c8!2s%C3%96NDER%20Kamp%20E%C4%9Fitim%20ve%20Konaklama%20Merkezi!5e1!3m2!1str!2str!4v1790584487517!5m2!1str!2str',
  },
];
