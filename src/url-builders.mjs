const enc = encodeURIComponent;

function booking(hotel, stay, guests) {
  const ages = guests.children.map((age) => `&age=${age}`).join('');
  return `https://www.booking.com/searchresults.html?ss=${enc(`${hotel.name}, ${hotel.location}`)}&checkin=${stay.checkIn}&checkout=${stay.checkOut}&group_adults=${guests.adults}&group_children=${guests.children.length}&no_rooms=${guests.rooms}${ages}`;
}

function agoda(hotel, stay, guests) {
  return `https://www.agoda.com/search?textToSearch=${enc(hotel.name)}&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&los=${stay.nights}&rooms=${guests.rooms}&adults=${guests.adults}&children=${guests.children.length}&childages=${guests.children.join(',')}`;
}

function makemytrip(hotel, stay, guests) {
  const roomGuests = `${guests.adults}e${guests.children.length}e${guests.children.join('e')}`;
  return `https://www.makemytrip.com/hotels/hotel-listing/?checkin=${stay.checkIn.replaceAll('-', '')}&checkout=${stay.checkOut.replaceAll('-', '')}&locusId=CTUDR&locusType=city&city=CTUDR&country=IN&searchText=${enc(hotel.name)}&roomStayQualifier=${enc(`R${guests.rooms}A${roomGuests}`)}`;
}

function tripadvisor(hotel, stay, guests) {
  return `https://www.tripadvisor.in/Search?q=${enc(`${hotel.name} ${hotel.location}`)}&searchSessionId=${enc(`${stay.checkIn}_${stay.checkOut}_${guests.adults}_${guests.children.join('-')}`)}`;
}

const builders = {
  official: (hotel) => hotel.bookingUrl || hotel.officialUrl,
  booking,
  agoda,
  makemytrip,
  tripadvisor
};

export function buildSourceUrl(source, hotel, stay, guests) {
  const builder = builders[source.urlBuilder];
  if (!builder) throw new Error(`Unknown URL builder: ${source.urlBuilder}`);
  return builder(hotel, stay, guests);
}
