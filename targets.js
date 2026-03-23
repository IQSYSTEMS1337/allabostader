// targets.js - THE APEX SHARDING MATRIX (Laglig & Maximal Täckning)

const swedishCounties = [
    "stockholms-lan", "skane-lan", "vastra-gotalands-lan", 
    "uppsala-lan", "ostergotlands-lan", "sodermanlands-lan",
    "jonkopings-lan", "kronobergs-lan", "kalmar-lan", 
    "gotlands-lan", "blekinge-lan", "hallands-lan", 
    "varmlands-lan", "orebro-lan", "vastmanlands-lan", 
    "dalarnas-lan", "gavleborgs-lan", "vasternorrlands-lan", 
    "jamtlands-lan", "vasterbottens-lan", "norrbottens-lan"
];

// Generera regionala djuplänkar för att kringgå gränser för sökresultat
const generateDeepShards = () => {
    const targets = [];
    
    swedishCounties.forEach(county => {
        // Fastighetsbyrån
        targets.push({
            name: `Fastighetsbyrån (${county})`,
            url: `https://www.fastighetsbyran.com/sv/sverige/till-salu/${county}`
        });
        
        // Svensk Fastighetsförmedling
        targets.push({
            name: `Svensk Fast (${county})`,
            url: `https://www.svenskfast.se/bostad/${county}/`
        });

        // Bjurfors
        targets.push({
            name: `Bjurfors (${county})`,
            url: `https://www.bjurfors.se/sv/tillsalu/${county}/?view=list`
        });

        // Länsförsäkringar Fastighetsförmedling
        targets.push({
            name: `Länsförsäkringar (${county})`,
            url: `https://www.lansfast.se/till-salu/bostad/sok/?q=${county}`
        });
        
        // SkandiaMäklarna
        targets.push({
            name: `SkandiaMäklarna (${county})`,
            url: `https://www.skandiamaklarna.se/till-salu/bostader/${county}`
        });
        
        // HusmanHagberg
        targets.push({
            name: `HusmanHagberg (${county})`,
            url: `https://www.husmanhagberg.se/sok/alla/?lan=${county}`
        });
        
        // Mäklarhuset
        targets.push({
            name: `Mäklarhuset (${county})`,
            url: `https://www.maklarhuset.se/bostad/${county}`
        });
    });

    return targets;
};

// Premium-mäklare och nischbyråer (Deras utbud är mindre, nationell sökning räcker)
const boutiqueAgencies = [
    { name: "Erik Olsson", url: "https://www.erikolsson.se/bostader-till-salu/" },
    { name: "Notar", url: "https://www.notar.se/kopa-bostad/bostader-till-salu" },
    { name: "Mohv", url: "https://www.mohv.se/bostader-till-salu/" },
    { name: "Våningen & Villan", url: "https://www.vaningen.se/objekt" },
    { name: "Lagerlings", url: "https://lagerlings.se/bostader-till-salu/" },
    { name: "Wrede", url: "https://www.wrede.se/objekt" },
    { name: "Skeppsholmen", url: "https://www.skeppsholmen.se/sv/bostader/" },
    { name: "ESNY", url: "https://esny.se/tillsalu/" },
    { name: "Fantastic Frank", url: "https://www.fantasticfrank.se/bostader-till-salu" },
    { name: "Historiska Hem", url: "https://historiskahem.se/tillsalu/" },
    { name: "Mäklarringen", url: "https://www.maklarringen.se/kopa/sok-bostad/" }
];

const apexTargets = [...generateDeepShards(), ...boutiqueAgencies];

module.exports = apexTargets;
