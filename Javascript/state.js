export let currentUser = null;
export let currentRole = "user";

export function setCurrentUser(user) {
  currentUser = user;
}

export function setCurrentRole(role) {
  currentRole = role;
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentRole() {
  return currentRole;
}

// Denne filen brukes til å lagre hvem som er innlogget og hvilken rolle brukeren har. 
// Den har to variabler: én for brukeren (som enten er en Supabase-bruker eller ingenting) og én for rollen, som starter som vanlig bruker. Det finnes funksjoner for å oppdatere disse verdiene, og egne funksjoner for å hente dem ut igjen. 
// Filen gjør ikke noe annet enn å holde styr på disse verdiene i minnet, men andre filer i prosjektet bruker den for å sjekke om noen er innlogget og hvilken rolle brukeren har.