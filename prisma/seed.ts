import bcrypt from "bcryptjs";
import {readFileSync} from "fs";
import {join} from "path";
import {prisma} from "../src/database";
import {CardModel} from "../src/generated/prisma/models/Card";
import {PokemonType} from "../src/generated/prisma/enums";

async function main() {
    console.log("🌱 Starting database seed...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    await prisma.user.createMany({
        data: [
            {
                username: "red",
                email: "red@example.com",
                password: hashedPassword,
            },
            {
                username: "blue",
                email: "blue@example.com",
                password: hashedPassword,
            },
        ],
    });

    const redUser = await prisma.user.findUnique({where: {email: "red@example.com"}});
    const blueUser = await prisma.user.findUnique({where: {email: "blue@example.com"}});

    if (!redUser || !blueUser) {
        throw new Error("Failed to create users");
    }

    console.log("✅ Created users:", redUser.username, blueUser.username);

    const pokemonDataPath = join(__dirname, "data", "pokemon.json");
    const pokemonJson = readFileSync(pokemonDataPath, "utf-8");
    const pokemonData: CardModel[] = JSON.parse(pokemonJson);

    const createdCards = await Promise.all(
        pokemonData.map((pokemon) =>
            prisma.card.create({
                data: {
                    name: pokemon.name,
                    hp: pokemon.hp,
                    attack: pokemon.attack,
                    type: PokemonType[pokemon.type as keyof typeof PokemonType],
                    pokedexNumber: pokemon.pokedexNumber,
                    imgUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexNumber}.png`,
                },
            })
        )
    );

    const getRandomCards = async (count: number = 10) => {
        const totalCards = await prisma.card.count();
        
        const randomIndices = new Set<number>();
        while (randomIndices.size < count) {
            randomIndices.add(Math.floor(Math.random() * totalCards));
        }
        console.log(randomIndices);
        
        const cards = [];
        for (const index of randomIndices) {
            const card = await prisma.card.findFirst({
                skip: index,
                take: 1
            });
            if (card) {
                cards.push(card);
            }
        }
        
        return cards;
    }

    // const createStartDeck = await prisma.deck.createMany({
    //     data: [
    //         {
    //             name: "Starter Deck Blue",
    //             userId: blueUser.id,
    //             deckCards: {
    //                 create: (await getRandomCards(10)).map(card => ({
    //                     cardId: card.id
    //                 }))
    //             }
    //         }, 
    //         {
    //             name: "Starter Deck Red",
    //             userId: redUser.id,
    //             deckCards: {
    //                 create: (await getRandomCards(10)).map(card => ({
    //                     cardId: card.id
    //                 }))
    //             }
    //         }
    //     ]
    // });

    const StarterDeckBlue = await prisma.deck.create({
        data: {
            name: "Starter Deck Blue",
            userId: blueUser.id,
            deckCards: {
                create: (await getRandomCards(10)).map(card => ({
                    cardId: card.id
                }))
            }
        },
    });

    console.log(`✅ Created Starter Deck Blue with 10 cards`);

    const StarterDeckRed = await prisma.deck.create({
        data: {
            name: "Starter Deck Red",
            userId: redUser.id,
            deckCards: {
                create: (await getRandomCards(10)).map(card => ({
                    cardId: card.id
                }))
            }
        },
    });

    console.log(`✅ Created Starter Deck Red with 10 cards`);

    console.log(`✅ Created ${pokemonData.length} Pokemon cards`);

    console.log("\n🎉 Database seeding completed!");
}

main()
    .catch((e) => {
        console.error("❌ Error seeding database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
