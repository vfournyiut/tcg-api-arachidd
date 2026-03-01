import { PokemonType } from "../generated/prisma/client";

export function getWeakness(defenderType: PokemonType): PokemonType | null {
    switch (defenderType) {
        case PokemonType.Normal:
            return PokemonType.Fighting;
        case PokemonType.Fire:
            return PokemonType.Water;
        case PokemonType.Water:
            return PokemonType.Electric;
        case PokemonType.Electric:
            return PokemonType.Ground;
        case PokemonType.Grass:
            return PokemonType.Fire;
        case PokemonType.Ice:
            return PokemonType.Fire;
        case PokemonType.Fighting:
            return PokemonType.Psychic;
        case PokemonType.Poison:
            return PokemonType.Psychic;
        case PokemonType.Ground:
            return PokemonType.Water;
        case PokemonType.Flying:
            return PokemonType.Electric;
        case PokemonType.Psychic:
            return PokemonType.Dark;
        case PokemonType.Bug:
            return PokemonType.Fire;
        case PokemonType.Rock:
            return PokemonType.Water;
        case PokemonType.Ghost:
            return PokemonType.Dark;
        case PokemonType.Dragon:
            return PokemonType.Ice;
        case PokemonType.Dark:
            return PokemonType.Fighting;
        case PokemonType.Steel:
            return PokemonType.Fire;
        case PokemonType.Fairy:
            return PokemonType.Poison;
        default:
            return null;
    }
}

export function getDamageMultiplier(attackerType: PokemonType, defenderType: PokemonType): number {
    const weakness = getWeakness(defenderType);
    if (weakness === attackerType) {
        return 2.0;
    }
    return 1.0;
}

export function calculateDamage(
    attackerAttack: number,
    attackerType: PokemonType,
    defenderType: PokemonType
): number {
    const multiplier = getDamageMultiplier(attackerType, defenderType);

    const damage = Math.floor(attackerAttack * multiplier);

    return Math.max(1, damage);
}
