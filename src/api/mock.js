// Fake data so the frontend runs before the backend exists.

export const MOCK_JAM = {
  id: "jam-i880n-coliseum",
  road: "I-880 N",
  near: "Oakland Coliseum",
  drivers: 38,
};

// The room "Connect" picks: the people closest to you in the jam.
export const MOCK_NEAREST_CHAT_ID = "chat-lounge";

const person = (id, name, detail, muted = false) => ({ id, name, detail, muted });

export const MOCK_CHATS = [
  {
    id: "chat-lounge",
    name: "Main lane lounge",
    topic: "Small talk while we crawl",
    people: [
      person("u-jordan", "Jordan", "2 cars ahead"),
      person("u-priya", "Priya", "Next lane over"),
      person("u-marco", "Marco", "Right behind you", true),
      person("u-linh", "Linh", "4 cars ahead"),
      person("u-dee", "Dee", "Carpool lane"),
      person("u-kenji", "Kenji", "3 cars back", true),
      person("u-rosa", "Rosa", "Next lane over"),
      person("u-sam", "Sam", "Up by the exit"),
      person("u-aiyana", "Aiyana", "5 cars back", true),
      person("u-tom", "Tom", "Merging in"),
      person("u-hana", "Hana", "2 cars back"),
    ],
  },
  {
    id: "chat-aux",
    name: "Aux cord",
    topic: "Swap song recs for the ride",
    people: [
      person("u-omar", "Omar", "Far left lane"),
      person("u-bea", "Bea", "Just merged"),
      person("u-theo", "Theo", "6 cars ahead", true),
      person("u-mai", "Mai", "Next lane over"),
      person("u-luis", "Luis", "Behind the bus"),
      person("u-ivy", "Ivy", "3 cars ahead"),
    ],
  },
  {
    id: "chat-merge",
    name: "Who's merging?",
    topic: "Updates from up ahead",
    people: [
      person("u-raj", "Raj", "At the front"),
      person("u-zoe", "Zoe", "By the on-ramp"),
      person("u-kim", "Kim", "Shoulder lane", true),
      person("u-nate", "Nate", "Behind the truck"),
    ],
  },
];

// Someone who pulls up and joins a few seconds after you do.
export const MOCK_NEWCOMER = person("u-kai", "Kai", "Just pulled up");
