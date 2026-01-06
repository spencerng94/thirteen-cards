# Shop Items Structure for SQL Migration

## Emotes (18 Total)

Based on the database structure and pricing logic, here are all 18 emotes:

| Name | Shortcode | File Path | Price (Gems) | Notes |
|------|-----------|-----------|--------------|-------|
| Angry Card | :angry: | round_3/angry_card.png | 200 | Standard |
| Annoyed | :eyeroll: | annoyed_card.png | 200 | Standard |
| Blushing | :blush: | blushing_card.png | 200 | Standard |
| Chin Check | :think: | round_3/chin_check_card.png | 200 | Standard |
| Chinese | :chinese: | chinese_card.png | 200 | Standard |
| Crying Card | :cry: | round_3/crying_card.png | 200 | Standard |
| Devil | :devil: | devil_card.png | 200 | Standard |
| Doge Focus | :doge_focus: | (check database) | 650 | Premium |
| Final Boss | :final_boss: | final_boss_card.png | 200 | Standard |
| Game Over | :game_over: | (check database) | 650 | Premium |
| Girly | :girly: | girly_card.png | 200 | Standard |
| Heart Card | :heart: | round_3/heart_card.png | 200 | Standard |
| Laugh Cry | :joy: | round_3/laugh_cry_card.png | 200 | Standard |
| Lunar New Year | :lunar_new_year: | (check database) | 450 | Premium |
| Seductive Dealer | :heart_eyes: | seductive_card.png | 450 | Premium |
| Shiba | :shiba: | shiba_card.png | 200 | Standard |
| Shiba Butt | :shiba_butt: | round_3/shiba_butt_card.png | 200 | Standard |
| Shiba Mask | :shiba_mask: | round_3/shiba_mask_card.png | 200 | Standard |
| The Mooner | :the_mooner: | (check database) | 450 | Premium |
| Taunt Card | :taunt: | round_3/taunt_card.png | 200 | Standard |

**Note:** The `:smile:` emote (Loyal Shiba) should NOT be included in the shop as it's been filtered out.

## Finishers (2 Total)

| Name | Animation Key | Price (Gems) |
|------|---------------|--------------|
| The Shiba Slam | shiba_slam | 1500 |
| The Ethereal Blade | ethereal_blade | 1500 |

## Board Themes (12 Premium - Gems Only)

| ID | Name | Price (Gems) | Currency |
|----|------|--------------|----------|
| CYBERPUNK_NEON | Onyx Space | 800 | GEMS |
| OBSIDIAN_MADNESS | Obsidian Madness | 800 | GEMS |
| CHRISTMAS_YULETIDE | Midnight Yuletide | 800 | GEMS |
| SHIBA | High Roller | 1200 | GEMS |
| JUST_A_GIRL | I'm Just a Girl | 1200 | GEMS |
| LAS_VEGAS | Las Vegas Strip | 1200 | GEMS |
| GOLD_FLUX | Gold Flux | 1300 | GEMS |
| HIGH_ROLLER | Sanctum Oblivion | 1300 | GEMS |
| LOTUS_FOREST | Lotus Deal | 1500 | GEMS |
| GOLDEN_EMPEROR | Lucky Envelope | 1500 | GEMS |
| ZEN_POND | Zen Pond | 1500 | GEMS |

**Note:** Basic board themes (Classic Imperial, Emerald Felt, Cobalt Felt, Baccarat Ruby) are priced in GOLD and don't need to be in the shop database.

---

## JSON Structure for Easy SQL Generation

```json
{
  "emotes": [
    { "name": "Angry Card", "shortcode": ":angry:", "file_path": "round_3/angry_card.png", "price": 200 },
    { "name": "Annoyed", "shortcode": ":eyeroll:", "file_path": "annoyed_card.png", "price": 200 },
    { "name": "Blushing", "shortcode": ":blush:", "file_path": "blushing_card.png", "price": 200 },
    { "name": "Chin Check", "shortcode": ":think:", "file_path": "round_3/chin_check_card.png", "price": 200 },
    { "name": "Chinese", "shortcode": ":chinese:", "file_path": "chinese_card.png", "price": 200 },
    { "name": "Crying Card", "shortcode": ":cry:", "file_path": "round_3/crying_card.png", "price": 200 },
    { "name": "Devil", "shortcode": ":devil:", "file_path": "devil_card.png", "price": 200 },
    { "name": "Doge Focus", "shortcode": ":doge_focus:", "file_path": "doge_focus_card.png", "price": 650 },
    { "name": "Final Boss", "shortcode": ":final_boss:", "file_path": "final_boss_card.png", "price": 200 },
    { "name": "Game Over", "shortcode": ":game_over:", "file_path": "game_over_card.png", "price": 650 },
    { "name": "Girly", "shortcode": ":girly:", "file_path": "girly_card.png", "price": 200 },
    { "name": "Heart Card", "shortcode": ":heart:", "file_path": "round_3/heart_card.png", "price": 200 },
    { "name": "Laugh Cry", "shortcode": ":joy:", "file_path": "round_3/laugh_cry_card.png", "price": 200 },
    { "name": "Lunar New Year", "shortcode": ":lunar_new_year:", "file_path": "lunar_new_year_card.png", "price": 450 },
    { "name": "Seductive Dealer", "shortcode": ":heart_eyes:", "file_path": "seductive_card.png", "price": 450 },
    { "name": "Shiba", "shortcode": ":shiba:", "file_path": "shiba_card.png", "price": 200 },
    { "name": "Shiba Butt", "shortcode": ":shiba_butt:", "file_path": "round_3/shiba_butt_card.png", "price": 200 },
    { "name": "Shiba Mask", "shortcode": ":shiba_mask:", "file_path": "round_3/shiba_mask_card.png", "price": 200 },
    { "name": "The Mooner", "shortcode": ":the_mooner:", "file_path": "the_mooner_card.png", "price": 450 },
    { "name": "Taunt Card", "shortcode": ":taunt:", "file_path": "round_3/taunt_card.png", "price": 200 }
  ],
  "finishers": [
    { "name": "The Shiba Slam", "animation_key": "shiba_slam", "price": 1500 },
    { "name": "The Ethereal Blade", "animation_key": "ethereal_blade", "price": 1500 }
  ],
  "board_themes": [
    { "id": "CYBERPUNK_NEON", "name": "Onyx Space", "price": 800 },
    { "id": "OBSIDIAN_MADNESS", "name": "Obsidian Madness", "price": 800 },
    { "id": "CHRISTMAS_YULETIDE", "name": "Midnight Yuletide", "price": 800 },
    { "id": "SHIBA", "name": "High Roller", "price": 1200 },
    { "id": "JUST_A_GIRL", "name": "I'm Just a Girl", "price": 1200 },
    { "id": "LAS_VEGAS", "name": "Las Vegas Strip", "price": 1200 },
    { "id": "GOLD_FLUX", "name": "Gold Flux", "price": 1300 },
    { "id": "HIGH_ROLLER", "name": "Sanctum Oblivion", "price": 1300 },
    { "id": "LOTUS_FOREST", "name": "Lotus Deal", "price": 1500 },
    { "id": "GOLDEN_EMPEROR", "name": "Lucky Envelope", "price": 1500 },
    { "id": "ZEN_POND", "name": "Zen Pond", "price": 1500 }
  ]
}
```

**Important Notes:**
1. Some emote file paths may need verification against your actual Supabase storage structure
2. Premium emote prices (650, 450) are set in code but should match database values
3. The `:smile:` emote is intentionally excluded from the shop
4. Board themes are client-side only (no database table needed) unless you want to track ownership
