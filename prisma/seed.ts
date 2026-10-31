import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';

const initialCategories = [
  {
    id: 'cat-sweeteners',
    name: 'Naatu Sakkarai & Vellam',
    tamilName: 'நாட்டு சர்க்கரை & வெல்லம்',
    slug: 'sweeteners',
    description: 'Unrefined country cane sugar, pure palm jaggery (Karupatti) and traditional round jaggery.',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    iconName: 'Sparkles',
    isPopular: true,
    displayOrder: 1,
  },
  {
    id: 'cat-traditional-rice',
    name: 'Traditional Rice',
    tamilName: 'பாரம்பரிய அரிசி',
    slug: 'traditional-rice',
    description: 'Native Indian rice varieties rich in micronutrients, low GI, and naturally chemical-free.',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    iconName: 'Wheat',
    isPopular: true,
    displayOrder: 2,
  },
  {
    id: 'cat-millets',
    name: 'Millets & Ancient Grains',
    tamilName: 'சிறு தானியங்கள்',
    slug: 'millets',
    description: 'High-fibre, gluten-free power grains including Thinai, Varagu, Samai and Kuthiraivali.',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    iconName: 'Sprout',
    isPopular: true,
    displayOrder: 3,
  },
  {
    id: 'cat-honey',
    name: 'Pure Forest Honey',
    tamilName: 'சுத்தமான மலைத்தேன்',
    slug: 'honey',
    description: '100% raw, unheated and unfiltered honey sourced straight from wild tribal harvesters.',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
    iconName: 'Droplet',
    isPopular: true,
    displayOrder: 4,
  },
  {
    id: 'cat-dates-dryfruits',
    name: 'Dates & Dry Fruits',
    tamilName: 'பேரீச்சம்பழம் & உலர்பழங்கள்',
    slug: 'dates-and-dryfruits',
    description: 'Handpicked Medjool, Ajwa and Kimia dates, tender Afghan figs and sun-dried raisins.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    iconName: 'HeartHandshake',
    isPopular: true,
    displayOrder: 5,
  },
  {
    id: 'cat-nuts-seeds',
    name: 'Nuts & Super Seeds',
    tamilName: 'பருப்புகள் & விதைகள்',
    slug: 'nuts-and-seeds',
    description: 'Crisp California almonds, premium W240 cashews, Kashmiri walnuts and raw super seeds.',
    image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=600&q=80',
    iconName: 'CircleDot',
    isPopular: true,
    displayOrder: 6,
  },
  {
    id: 'cat-oils-ghee',
    name: 'Wood Pressed Oils & Ghee',
    tamilName: 'செக்கு எண்ணெய் & நெய்',
    slug: 'oils-and-ghee',
    description: 'Traditional Mara Chekku cold pressed groundnut, sesame & coconut oils, plus pure bilona ghee.',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
    iconName: 'Flame',
    isPopular: false,
    displayOrder: 7,
  },
  {
    id: 'cat-spices',
    name: 'Spices & Immunity Herbs',
    tamilName: 'நாட்டு மருந்துகள் & மசாலா',
    slug: 'spices',
    description: 'High-curcumin Salem turmeric, Wayanad black pepper, green cardamom and sukku powder.',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
    iconName: 'Sparkle',
    isPopular: false,
    displayOrder: 8,
  },
];

const initialProducts = [
  {
    name: 'Pure Organic Naatu Sakkarai (Country Sugar)',
    tamilName: 'இயற்கை நாட்டு சர்க்கரை',
    slug: 'pure-organic-naatu-sakkarai',
    categorySlug: 'sweeteners',
    shortDescription: '100% natural, unbleached, and chemical-free sugarcane brown sugar rich in minerals and iron.',
    description: 'Our traditional Naatu Sakkarai is crafted using heirloom sugarcane varieties cultivated in the Bhavani river basin of Erode. Extracted without sulfur or chemical clarifiers, it preserves native molasses, giving it an earthy caramel aroma and vital micronutrients. Perfect substitute for white sugar in tea, coffee, baby foods, and traditional sweets.',
    benefits: [
      'Zero refined chemicals, no bone-char or sulfur used',
      'Naturally rich in Iron, Calcium, and Potassium',
      'Aids digestion and purifies blood naturally',
      'Pleasant aromatic sweetness with low glycemic load'
    ],
    origin: 'Erode, Tamil Nadu',
    rating: 4.9,
    reviewCount: 328,
    images: [
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: true,
    isTopSeller: true,
    isOrganic: true,
    badge: 'Bestseller',
    nutritionHighlights: {
      'Iron': '2.4 mg / 100g',
      'Calcium': '80 mg / 100g',
      'Processing': 'Cold Clarified',
      'Preservatives': 'Zero'
    },
    variants: [
      { label: '500 g', price: 65, originalPrice: 75, stock: 150, inStock: true },
      { label: '1 kg', price: 120, originalPrice: 145, stock: 220, inStock: true },
      { label: '5 kg (Saver Pack)', price: 575, originalPrice: 700, stock: 45, inStock: true }
    ]
  },
  {
    name: 'Authentic Udangudi Karupatti (Palm Jaggery)',
    tamilName: 'உடன்குடி பனை கருப்பட்டி',
    slug: 'authentic-udangudi-karupatti-palm-jaggery',
    categorySlug: 'sweeteners',
    shortDescription: 'Original Udangudi palm jaggery made from unfermented palmyra sap without adulteration.',
    description: 'Directly sourced from traditional palm climbing artisans in Udangudi, Tuticorin. Made by slow boiling pure padhaneer in heavy brass cauldrons until it sets into dense, dark, nutrient-dense blocks. Packed with medicinal properties, ideal for Sukku Kaapi (ginger coffee) and postpartum nourishment.',
    benefits: [
      'Rich in vitamin B-complex and essential dietary minerals',
      'Effective traditional remedy for cough, throat relief & breathing vitality',
      'Extremely low glycemic index compared to normal cane sugars',
      'Pure single-origin harvest from coastal Palmyra palms'
    ],
    origin: 'Udangudi, Tamil Nadu',
    rating: 4.95,
    reviewCount: 214,
    images: [
      'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: true,
    isTopSeller: true,
    isOrganic: true,
    badge: 'Traditional GI Tagged',
    nutritionHighlights: {
      'Potassium': '1050 mg / 100g',
      'Iron': '11 mg / 100g',
      'Additives': '0% Nil'
    },
    variants: [
      { label: '250 g', price: 95, originalPrice: 110, stock: 80, inStock: true },
      { label: '500 g', price: 180, originalPrice: 210, stock: 120, inStock: true },
      { label: '1 kg', price: 350, originalPrice: 410, stock: 65, inStock: true }
    ]
  },
  {
    name: 'Golden Round Jaggery (Urundai Vellam)',
    tamilName: 'உருண்டை வெல்லம்',
    slug: 'golden-round-jaggery-urundai-vellam',
    categorySlug: 'sweeteners',
    shortDescription: 'Traditional round jaggery balls naturally hardened without chemical colors or sodium hydrosulfite.',
    description: 'Golden-amber traditional round jaggery molded with organic okro (ladies finger) plant mucilage as a natural clarifier. Offers the classic rich taste required for festival Sakkarai Pongal, Payasam, Kozhukattai, and daily cooking.',
    benefits: [
      'No artificial yellow colorants or chemical bleaching',
      'Warm and comforting digestion booster after meals',
      'Essential authentic base for festival sweets and sweets',
      'Pure sugarcane juice concentrate'
    ],
    origin: 'Pollachi, Tamil Nadu',
    rating: 4.8,
    reviewCount: 142,
    images: [
      'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: false,
    isTopSeller: false,
    isOrganic: true,
    badge: 'Festival Essential',
    variants: [
      { label: '500 g', price: 55, originalPrice: 65, stock: 90, inStock: true },
      { label: '1 kg', price: 105, originalPrice: 125, stock: 140, inStock: true }
    ]
  },
  {
    name: 'Mappillai Samba Traditional Red Rice',
    tamilName: 'மாப்பிள்ளை சம்பா அரிசி',
    slug: 'mappillai-samba-traditional-red-rice',
    categorySlug: 'traditional-rice',
    shortDescription: 'The legendary "Bridegroom\'s Rice" celebrated for stamina, nerve strength, and iron density.',
    description: 'Mappillai Samba is a native Tamil Nadu red rice variety famous for building robust physical endurance and stamina. Naturally pest-resilient, it is grown using Vedic agricultural practices. It has high dietary fiber, a firm bite, and an earthy nutty taste when cooked. Best enjoyed with sambar, rasam, curd, or fermented as probiotic Neeragaram.',
    benefits: [
      'Extremely rich in Iron and Zinc to combat anemia',
      'Supports healthy blood sugar balance with slow-release carbs',
      'Strengthens muscles, nerves, and bodily stamina',
      'Superb for making fermented probiotic Kanji (pazhaiya sadham)'
    ],
    origin: 'Thiruvannamalai, Tamil Nadu',
    rating: 4.9,
    reviewCount: 189,
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: true,
    isTopSeller: true,
    isOrganic: true,
    badge: 'Stamina Superfood',
    nutritionHighlights: {
      'Fiber': '7.8 g / 100g',
      'Iron': '4.8 mg / 100g',
      'GI Index': 'Low (< 55)'
    },
    variants: [
      { label: '1 kg', price: 135, originalPrice: 160, stock: 110, inStock: true },
      { label: '5 kg (Saver Pack)', price: 640, originalPrice: 750, stock: 30, inStock: true }
    ]
  },
  {
    name: 'Karuppu Kavuni Black Rice (Emperor\'s Rice)',
    tamilName: 'கருப்பு கவுனி அரிசி',
    slug: 'karuppu-kavuni-black-rice',
    categorySlug: 'traditional-rice',
    shortDescription: 'The crown jewel of Chettinad heritage, packed with more anthocyanin antioxidants than blueberries.',
    description: 'Karuppu Kavuni is an ancient heirloom black rice historically served to royalty in Chettinad and Southeast Asia. The deep purple-black pigment is powered by Anthocyanin—a potent antioxidant that supports cellular repair and cardiovascular wellness. Traditionally cooked into decadent Kavuni Arisi sweet pudding or savory porridge.',
    benefits: [
      'Contains supreme levels of Anthocyanin antioxidants',
      'Anti-inflammatory properties that support heart and vascular health',
      'Helps detoxify liver and regulate lipid levels',
      'Deep, luxurious nutty flavor with wholesome chewy texture'
    ],
    origin: 'Karaikudi / Sivagangai, Tamil Nadu',
    rating: 4.98,
    reviewCount: 260,
    images: [
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: true,
    isTopSeller: true,
    isOrganic: true,
    badge: 'Antioxidant King',
    nutritionHighlights: {
      'Antioxidants': 'Anthocyanin Dense',
      'Protein': '8.5 g / 100g',
      'Fibre': '8.9 g / 100g'
    },
    variants: [
      { label: '500 g', price: 110, originalPrice: 130, stock: 75, inStock: true },
      { label: '1 kg', price: 210, originalPrice: 250, stock: 140, inStock: true },
      { label: '5 kg', price: 990, originalPrice: 1200, stock: 20, inStock: true }
    ]
  },
  {
    name: 'Western Ghats Wild Forest Raw Honey',
    tamilName: 'இயற்கை மலைத்தேன்',
    slug: 'western-ghats-wild-forest-raw-honey',
    categorySlug: 'honey',
    shortDescription: 'Unheated, unfiltered multi-flora raw honey harvested from wild Apis Dorsata combs.',
    description: 'Sourced from the pristine canopy of the Western Ghats by indigenous tribal gatherers. Extracted without heat treatment, fine pasteurization, or micro-filtering, keeping live enzymes, bee pollen, and natural royal propolis fully intact. Dark, thick, with notes of blooming forest medicinal flora.',
    benefits: [
      'Zero added jaggery, corn syrup, or inverted sugar',
      'Active natural enzymes that boost daily immunity',
      'Soothes throat irritation and seasonal dry cough',
      'Direct tribal ethical partnership, sustainable harvesting'
    ],
    origin: 'Western Ghats (Anaimalai Hills), Tamil Nadu',
    rating: 4.97,
    reviewCount: 310,
    images: [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: true,
    isTopSeller: true,
    isOrganic: true,
    badge: '100% Raw & Pure',
    nutritionHighlights: {
      'Purity': 'NMR Tested 100%',
      'Pasteurization': 'Never Heated',
      'Bee Pollen': 'Intact'
    },
    variants: [
      { label: '250 g', price: 195, originalPrice: 240, stock: 60, inStock: true },
      { label: '500 g', price: 360, originalPrice: 440, stock: 95, inStock: true },
      { label: '1 kg (Glass Bottle)', price: 680, originalPrice: 820, stock: 40, inStock: true }
    ]
  },
  {
    name: 'Royal Medjool Jumbo Dates (Jordan Valley)',
    tamilName: 'ராயல் மஜ்ஹூல் பேரீச்சம்பழம்',
    slug: 'royal-medjool-jumbo-dates',
    categorySlug: 'dates-and-dryfruits',
    shortDescription: 'King of Dates — plump, moist, large-sized with decadent caramel undertones.',
    description: 'Hand-selected Jumbo Medjool dates imported fresh from the warm Jordan Valley. Known as the King of Dates for their opulent size, soft creamy skin, and melt-in-mouth caramel sweetness without any sticky glucose coating.',
    benefits: [
      '100% natural energy booster without processed sugar',
      'High in Potassium for muscle endurance and electrolyte balance',
      'Soluble fiber helps regulate healthy digestion',
      'Free from chemical glazing or artificial preservative sprays'
    ],
    origin: 'Jordan Valley',
    rating: 4.96,
    reviewCount: 220,
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: true,
    isTopSeller: true,
    isOrganic: true,
    badge: 'Jumbo Size',
    nutritionHighlights: {
      'Energy': '277 kcal / 100g',
      'Potassium': '696 mg / 100g',
      'Added Sugar': '0%'
    },
    variants: [
      { label: '500 g Box', price: 490, originalPrice: 580, stock: 65, inStock: true },
      { label: '1 kg Box', price: 950, originalPrice: 1150, stock: 40, inStock: true }
    ]
  },
  {
    name: 'Mangalore W240 Jumbo Cashew Nuts (Kaju)',
    tamilName: 'முந்திரி பருப்பு (W240)',
    slug: 'mangalore-w240-jumbo-cashew-nuts',
    categorySlug: 'nuts-and-seeds',
    shortDescription: 'Grade W240 whole, creamy white jumbo cashew kernels with a rich buttery crunch.',
    description: 'Freshly shelled whole cashews carefully graded W-240 (standard king size). Crisp texture, pristine ivory color, and an unctuous nutty finish. Sourced from coastal Karnataka & Kerala cashew groves without oily sulfur baths.',
    benefits: [
      'Healthy monounsaturated and polyunsaturated fats',
      'Rich in copper, magnesium, and plant-based protein',
      'Vacuum-sealed packaging ensures garden-fresh crunch',
      'Non-fried, non-salted, 100% whole raw grade'
    ],
    origin: 'Mangalore, Karnataka',
    rating: 4.93,
    reviewCount: 285,
    images: [
      'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=800&q=80'
    ],
    isFeatured: true,
    isTopSeller: true,
    isOrganic: false,
    badge: 'Grade W240 King',
    variants: [
      { label: '250 g', price: 245, originalPrice: 290, stock: 95, inStock: true },
      { label: '500 g', price: 470, originalPrice: 560, stock: 115, inStock: true },
      { label: '1 kg (Vacuum Sealed)', price: 920, originalPrice: 1100, stock: 45, inStock: true }
    ]
  }
];

async function seed() {
  console.log('🌿 Seeding authentic Ghajanas catalog to Supabase PostgreSQL...');

  // 1. Seed Categories
  const categoryMap: Record<string, string> = {};

  for (const cat of initialCategories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        tamilName: cat.tamilName,
        description: cat.description,
        image: cat.image,
        iconName: cat.iconName,
        isPopular: cat.isPopular,
        displayOrder: cat.displayOrder,
      },
      create: {
        name: cat.name,
        tamilName: cat.tamilName,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        iconName: cat.iconName,
        isPopular: cat.isPopular,
        displayOrder: cat.displayOrder,
      },
    });
    categoryMap[cat.slug] = record.id;
    console.log(`✓ Category: ${cat.name} (${record.id})`);
  }

  // 2. Seed Products
  for (const prod of initialProducts) {
    const categoryId = categoryMap[prod.categorySlug];
    if (!categoryId) continue;

    const existingProduct = await prisma.product.findUnique({
      where: { slug: prod.slug },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          name: prod.name,
          tamilName: prod.tamilName,
          slug: prod.slug,
          categoryId,
          shortDescription: prod.shortDescription,
          description: prod.description,
          benefits: prod.benefits,
          origin: prod.origin,
          rating: new Prisma.Decimal(prod.rating),
          reviewCount: prod.reviewCount,
          images: prod.images,
          isFeatured: prod.isFeatured,
          isTopSeller: prod.isTopSeller,
          isOrganic: prod.isOrganic,
          badge: prod.badge,
          nutritionHighlights: prod.nutritionHighlights,
          isActive: true,
          variants: {
            create: prod.variants.map((v) => ({
              label: v.label,
              price: new Prisma.Decimal(v.price),
              originalPrice: v.originalPrice ? new Prisma.Decimal(v.originalPrice) : null,
              stock: v.stock,
              inStock: v.inStock,
              isActive: true,
            })),
          },
        },
      });
      console.log(`✓ Created Product: ${prod.name}`);
    } else {
      console.log(`- Product already exists: ${prod.name}`);
    }
  }

  console.log('✅ Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  });

