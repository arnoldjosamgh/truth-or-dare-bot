import * as fs from "fs";
import * as path from "path";

/** Gender-neutral roasts — used for everyone */
export const ROASTS: ReadonlyArray<string> = [
    "How do you even function daily?",
    "Explain it like you're five?",
    "Clearly, you lack comprehension.",
    "Your ignorance is exhausting.",
    "Did that strain your brain?",
    "Go back to school.",
    "You must be slow.",
    "Is English your second language?",
    "You can't be serious.",
    "That is purely pathetic.",
    "Are you always this dense?",
    "A toddler understands this better.",
    "Your opinion is completely worthless.",
    "Did you leave your brain behind?",
    "This is embarrassingly simple.",
    "You are a total waste of time.",
    "Stop talking, you are embarrassing yourself.",
    "No one cares about your thoughts.",
    "You bring down the average IQ.",
    "Are you incapable of basic thought?",
    "The closest you'll come to a brainstorm is a light drizzle.",
    "You look smarter in pictures.",
    "Honestly, I'm just impressed you could read this.",
    "We need an evacuation plan for your bathroom breaks.",
    "Your family tree didn't have enough branches.",
    "Your existence proves that intelligent design doesn't exist.",
    "Your face just made me agnostic.",
    "Were you dropped a lot as a baby?",
    "Your brain is mush.",
    "You smell terrible today. And every other day.",
    "You should come with a warning label.",
    "I'm still deciding whether you're the weakest link or the missing link.",
    "I have neither the time nor the crayons necessary to explain this to you.",
    "You are an oxygen bandit.",
    "I've had bowel movements more attractive than you.",
    "You should be in charge of unclogging every clogged toilet.",
    "Dang, you're still alive?",
    "There's stupid leaking out of your mouth again.",
    "You do you. Because God knows no one else will.",
    "I think I got brain damage just from listening to you talk.",
    "I always appreciate your advice, so I know what not to do.",
    "You look like a before picture.",
    "If you doubled your IQ, it'd be zero.",
    "Next time you're in town, be sure not to message me.",
    "Are you drunk right now?",
    "You could have been an extra in Chernobyl.",
    "You're a marvel of stupidity.",
    "What doesn't kill you disappoints the rest of us.",
    "I was in such a good mood until you spoke.",
    "Did you develop your personality in a car crash?",
    "I can't talk to you right now. My doctor said I should avoid things that make me nauseous.",
    "You snatched defeat from the jaws of victory.",
    "I heard you've fallen on hard times. I just hope they continue.",
    "I smell smoke. Were you thinking too hard again?",
    "Being bitter won't make you prettier.",
    "We live in very divisive times, but we can all agree that you're a moron.",
    "They say looks can be deceiving, but you're actually as stupid as you look.",
    "If it ever seems like nothing is going your way, just know that it's because you're a bad person.",
    "I envy everyone who hasn't met you.",
    "I'm blessed to have so many good friends. Then there's you.",
    "Your birthday should be a global day of mourning.",
    "When you were born, the world really needed an undo button.",
    "If ignorance is bliss, you must be ecstatic at all times.",
    "You'd fail a personality test.",
    "Did you sniff a lot of glue as a kid?",
    "You're proof that accidents happen.",
    "We all just received some horrible news. You still exist.",
    "I'd never make you explain yourself. I don't want you to pass out.",
    "They need to give you a Guinness World Record for being the most useless person ever.",
    "There really is one born every minute.",
    "Can I switch to the timeline where you don't exist?",
    "You're completely right, except for everything you just said.",
    "You'll go far someday. And I hope you stay there.",
    "Did you forget to breathe again?",
    "You're proof that the gene pool needs lifeguards.",
    "How are you still here? Isn't it trash day?",
    "Your gene pool needs more chlorine.",
    "I will not have a battle of wits with an unarmed opponent.",
    "It's impossible to underestimate you.",
    "Evolution hit a roadblock when you were born.",
    "Did you just wake up from a coma?",
    "Though some people fear success, rest assured, you have nothing to worry about.",
    "Your existence is a conspiracy against the human race.",
    "The key to happiness is to avoid you at all costs.",
    "You give idiots a bad name.",
    "I'm not very religious, but I believe God is testing me whenever you walk into the room.",
    "You're about as useful as a screen door on a submarine.",
    "The only time you're not as dumb as you look is when I close my eyes.",
    "You're not a friend. You're a chore.",
    "You look like someone fed you after midnight.",
    "You're really holding back humanity.",
    "You should write a self-help book. Call it How to Live as an Idiot.",
    "If we really are living in a simulation, you're the bug in the program.",
    "You're weapons-grade stupid.",
    "Even Bob Ross would call you a mistake.",
    "If I gave you a penny for your thoughts, I'd get change back.",
    "Our parents told us we could be anything, and you chose disappointment.",
    "There's this great book I'll recommend you, if you ever learn how to read.",
    "You should teach people how to clear their minds. Since you're always empty-headed.",
    "I think of you often. On trash day.",
    "It was great seeing you yesterday. Also, you're stupid.",
    "If your IQ were just a little higher you could be an idiot.",
    "You're not the dumbest person alive, but you better hope they're taking vitamins.",
    "I saw you the other day. I was relieved that you didn't see me.",
    "I expect nothing and am still disappointed.",
    "The bar is beneath the ground and we need a metal detector to find it.",
    "I'm trying to get rid of some junk today. I just need to lure you into a trash bin.",
    "I'd love to help you out. Which way did you get in?",
    "Light travels faster than sound, which is why you seemed bright until you spoke.",
    "I'm tired of seeing your stupid face.",
    "You're not the brightest crayon in the box.",
    "You're as bright as beige.",
    "You look like something I drew with my left hand.",
    "Our group's average IQ just plummeted now that you're here.",
    "All my friends are coming to my birthday party. That's why you won't be there.",
    "If genius skips a generation, your parents must be masterminds.",
    "Don't bother covering up your answers. No one's gonna cheat off you.",
    "You're incredible. Incredibly stupid.",
    "Silence is golden, but for you, it's actually diamond status.",
    "Your parents didn't put many points in intelligence when they created you.",
    "If zombies tried eating your brains, they'd starve.",
    "If you were any dumber I'd have to water you once a day.",
    "You bring as much joy to the world as a wet sock.",
    "You're a gray sprinkle on a Funfetti cupcake.",
    "Your face would make an onion cry.",
    "Don't be ashamed of who you are. That's your parents' job.",
    "You remind me of my dog, who chases his own tail for entertainment.",
    "Were you drinking from the toilet again?",
    "You're why shampoo bottles have instructions.",
    "If you ever had to speak your mind, you'd be silent.",
    "That sounds like a you problem.",
    "You are like a cloud. When you disappear, it's a beautiful day.",
    "We're hoping you'll join the team this year. We need a mascot.",
    "I'd say you're dumb as a rock, but at least rocks are useful.",
    "I'm not insulting you. I'm describing you.",
    "If I throw a stick, will you leave?",
    "Don't worry, you weren't adopted. No one would do that on purpose.",
    "If stupidity were a crime, you'd be serving a life sentence.",
    "You bring joy to every room you exit.",
    "You have a face for radio.",
    "You're as useful as a chocolate teapot.",
    "You're about as bright as a cave.",
    "You should become an astronaut. We need you as far away from Earth as possible.",
    "Your mom gave me $20 to hang out with you.",
    // Uganda-flavored neutral
    "Stop acting corporate. Your entire net worth can be wiped out by one KCCA fine.",
    "You want to look rich so bad you are taking selfies with people's cars in parking lots.",
    "Your future is looking bleaker than the traffic gridlock at Northern Bypass.",
    "Stop trying to give life advice. You can't even manage your own data bundle.",
    "You are trying to look dangerous but you look like you can be defeated by a single mosquito.",
    "Your opinions are as useless as the broken traffic lights in Wandegeya.",
];

/** Male-specific roasts */
export const MALE_ROASTS: ReadonlyArray<string> = [
    "You are flexing a rented Passo but your fuel tank is permanently on E.",
    "You are out here tweeting 'invest in yourself' but your rent is four months late.",
    "You are tweeting from an iPhone 16 but you are still eating rolex on credit.",
    "You act like an international celeb but you haven't even crossed to Mutukula.",
    "Stop calling yourself a 'CEO.' You just sell faded thrift clothes on WhatsApp status.",
    "You are trying to speak with a posh accent but the Luganda is fighting back hard.",
    "You are trying to be a Twitter influencer but your engagement is lower than the value of the Shilling.",
    "Your ego is huge but your knees are dark from kneeling for old men's money.",
    "You call yourself a man but you can't even fix a flat tyre without calling your mum.",
    "You've been 'coming up' for five years. At this point, you're going down.",
    "Your gym selfies are more consistent than your rent payments.",
    "You act tough online but you flinch at every loud sound in real life.",
    "You ghost girls but cry when the same energy is returned.",
    "Your LinkedIn says CEO. Your bank account says 'insufficient funds.'",
    "You are the reason your father drinks.",
    "Your idea of investing is buying airtime in bulk.",
    "You are posting 'real men don't cry' but you cried watching a football match last week.",
    "Stop sending girls 'Good morning' texts. Start sending your landlord rent.",
    "You are fighting girls online over a man who shares boxers with his roommate.",
    "He didn't take you to Munyonyo because he loves you. He just wanted cheap weekend company.",
];

/** Female-specific roasts */
export const FEMALE_ROASTS: ReadonlyArray<string> = [
    "You talk about 'slaying' but your makeup makes you look like a repainted Pioneer bus.",
    "You think you are his main chick but you are just on the bench like a substitute keeper.",
    "She likes your tweets but she ignores your WhatsApp messages for three days.",
    "You are posting 'my king' but that king belongs to the whole of Makerere.",
    "Your birth control of choice appears to be your personality.",
    "If you're going to be two-faced, at least make one of them cute.",
    "Your mom wishes the stork left a gift receipt with you.",
    "You are fighting girls online over a man who doesn't know your middle name.",
    "You post 'unbothered' then check his last seen every 20 minutes.",
    "Your highlight reel is borrowed. Your real life is a rerun of a bad TV show.",
    "You call yourself a queen but you are waiting on a man to build your throne.",
    "You block him then unblock him at 2am. We see you.",
    "Your body count is higher than your GPA.",
    "You have more drama than a Ugandan soap opera and half the plot.",
    "You say 'I don't need a man' but your ringtone is still his favourite song.",
    "Your edges are laid but your priorities are scattered.",
    "You went to the salon for confidence and still came out empty.",
    "Stop posting motivational quotes. Start paying your NWSC bill.",
    "You are everybody's therapist but your own mental health is a construction site.",
    "You are not 'unbothered.' You are just very good at pretending online.",
];

export const randomRoast = (): string =>
    ROASTS[Math.floor(Math.random() * ROASTS.length)];

/** Returns a gender-appropriate roast, falling back to neutral if gender unknown */
export const getGenderedRoast = (gender?: string | null): string => {
    const g = (gender ?? "").toUpperCase();
    if (g === "M") {
        const pool = [...ROASTS, ...MALE_ROASTS];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    if (g === "F") {
        const pool = [...ROASTS, ...FEMALE_ROASTS];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    return randomRoast();
};

/** Mixes all hardcoded roasts + the stop-roasts.json file, with optional gender targeting */
export const getRandomMixedRoast = (gender?: string | null): string => {
    const g = (gender ?? "").toUpperCase();
    let pool: string[] = [...ROASTS];
    if (g === "M") pool = pool.concat([...MALE_ROASTS]);
    else if (g === "F") pool = pool.concat([...FEMALE_ROASTS]);

    try {
        const filePath = path.join(process.cwd(), "public", "stop-roasts.json");
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            if (Array.isArray(data.messages) && data.messages.length > 0) {
                pool = pool.concat(data.messages);
            }
        }
    } catch (err) {
        // Fall back to hardcoded pool
    }
    return pool[Math.floor(Math.random() * pool.length)];
};

export const SEVERE_ROASTS: ReadonlyArray<string> = [
    "Naye otegele lwakumeka Damu ekibuzo",
    "Olina amagezi Damu ekibuzo",
    "Labba embizzi eno damu ekibuzo",
    "Nyoko damu ekibuzzo",
    "Naye Nte gwe damu ekibuzo",
];

export const randomSevereRoast = (): string =>
    SEVERE_ROASTS[Math.floor(Math.random() * SEVERE_ROASTS.length)];
