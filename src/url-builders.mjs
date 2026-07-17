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

function official(hotel, stay, guests) {
  if (hotel.officialAdapter === 'fairmont' && hotel.officialCode) {
    const params = new URLSearchParams({
      dateIn: stay.checkIn,
      lengthOfStayValue: String(stay.nights),
      client: 'aem.fairmont',
      languageCode: 'en',
      hotelCodes: hotel.officialCode,
      'product[0][adultNumber]': String(guests.adults),
      'product[0][childNumber]': String(guests.children.length)
    });
    guests.children.forEach((age, index) => params.set(`product[0][childrenAges][${index}]`, String(age)));
    return `https://permalink.fairmont.com/booking/select?${params}`;
  }
  if (hotel.officialAdapter === 'wyndham') {
    const params = new URLSearchParams({
      checkInDate: stay.checkIn,
      checkOutDate: stay.checkOut,
      rooms: String(guests.rooms),
      adults: String(guests.adults),
      children: String(guests.children.length),
      childAge: guests.children.join(','),
      useWRPoints: 'false'
    });
    return `${hotel.bookingUrl}?${params}`;
  }
  return hotel.bookingUrl || hotel.officialUrl;
}

const builders = {
  official,
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
