import fs from 'fs';

const PAGE_RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];

function c(id, name, description) {
  return { id, name, description };
}

function makeBook(bookId, name, rarity, shelfId, order, byRarity, idPrefix) {
  const pages = PAGE_RARITIES.map((pageRarity, idx) => {
    const pageNum = idx + 1;
    const list = byRarity[pageRarity];
    if (!list || list.length !== 4) {
      throw new Error(`${shelfId}/${bookId}/${pageRarity}: need 4 cards, got ${list?.length}`);
    }
    return {
      id: `${bookId}-page-${pageNum}`,
      number: pageNum,
      rarity: pageRarity,
      cards: list.map((card, slot) => ({
        id: `${idPrefix}-${card.id}`,
        name: card.name,
        description: card.description,
        rarity: pageRarity,
        slotIndex: slot,
        bookId,
        shelfId,
        standId: 'permanent',
      })),
    };
  });

  return { id: bookId, name, rarity, shelfId, order, enabled: true, pages };
}

// Правило: mythic = самых узнаваемых «хотят все»; common = фон / меньше хайпа.

const ytGames = {
  common: [
    c('stintik', 'Стинтик', 'Активный контент, мемы и игры для своих.'),
    c('papercat', 'PaperCat', 'Лёгкий гейминг и реакции.'),
    c('datoff', 'Дато', 'Стримы и нарезки в стабильном ритме.'),
    c('gensyxa', 'Gensyxa', 'Энергичные прохождения без остановки.'),
  ],
  rare: [
    c('frame_tamer', 'Frame Tamer', 'Хардкорный стиль и своя аудитория.'),
    c('ceh9', 'Ceh9', 'Киберспорт-разборы для ленты.'),
    c('flackjk', 'FlackJK', 'Характер и плотный график роликов.'),
    c('gost', 'Гост', 'Стримерский вайб «в теме» сейчас.'),
  ],
  epic: [
    c('deepins', 'Deepins', 'Громкие реакции и эмоции в кадре.'),
    c('tenderlybae', 'Tenderlybae', 'Стримы и большой интерес молодёжи.'),
    c('evaelfie', 'Ева Эльфи', 'Харизма и постоянный контент.'),
    c('holy', 'Холли', 'Узнаваемый стиль и активная сцена.'),
  ],
  legendary: [
    c('buster', 'Бустер', 'Топ-хайп стриминга и миллионные эмоции.'),
    c('bratishkinoff', 'Братишкин', 'Почти всегда в рекомендациях у Gen Z.'),
    c('mellstroy', 'Mellstroy', 'Эпатаж, стримы и огромные охваты.'),
    c('evelone', 'Evelone', 'Легенда хайпа стримерской культуры.'),
  ],
  mythic: [
    c('exile', 'EXILE', 'Одно из самых желанных имён сцены сейчас.'),
    c('nowkiee', 'NOWKIEE', 'Лицо актуального RU-контента для молодёжи.'),
    c('nfkrz', 'NFKRZ', 'Максимальная узнаваемость и влияние.'),
    c('temnyy_princ', 'Тёмный Принц', 'Мемный топ и культ аудитории.'),
  ],
};

const ytLifestyle = {
  common: [
    c('sasha_story', 'Саша Story', 'Быт и влоги без гигантского хайпа.'),
    c('anya_noya', 'Аня Ноя', 'Лайфстайл и тренды недели.'),
    c('masha_vlog', 'Маша Влог', 'Повседневка крупным планом.'),
    c('nikita_day', 'Никита Day', 'День из жизни в shorts.'),
  ],
  rare: [
    c('damir', 'Damir', 'Стиль и визуал для ленты.'),
    c('annet_sai', 'Annet Sai', 'Эстетика Gen Z.'),
    c('ada_pokrov', 'Аня Покров', 'Сообщество и стабильный интерес.'),
    c('egor_ship', 'Егор Шип', 'Музыка + лайф для рекомендаций.'),
  ],
  epic: [
    c('karinakross', 'Карина Кросс', 'Хелленджи и сильная медийность.'),
    c('katya_adushkina', 'Катя Адушкина', 'Кроссовер платформ.'),
    c('gormoney', 'Гормони', 'Стиль и дерзость трендов.'),
    c('asayami', 'Asayami', 'Актуальный образ и вайб.'),
  ],
  legendary: [
    c('ivleeva', 'Настя Ивлеева', 'Шоу и огромный охват.'),
    c('danya_milokhin', 'Даня Милохин', 'Символ эпохи коротких видео.'),
    c('karna_val', 'Карнавал', 'Топ медийности среди молодёжи.'),
    c('instasamka_life', 'Instasamka', 'Вайб сцены, которую смотрит Gen Z.'),
  ],
  mythic: [
    c('morgen_life', 'Моргенштерн', 'Хайп-лицо эпохи для молодёжи.'),
    c('kreed_life', 'Егор Крид', 'Звезда, которую узнают вне музыки.'),
    c('exile_life', 'EXILE', 'Статус, который хотят в коллекции.'),
    c('nowkiee_life', 'NOWKIEE', 'Актуальное имя №1 в ленте.'),
  ],
};

const ytEntertainment = {
  common: [
    c('sketch_daily', 'Скетч Daily', 'Короткие шутки для ленты.'),
    c('react_hub', 'React Hub', 'Реакции на тренды недели.'),
    c('fail_ru', 'Fail RU', 'Фейлы и нарезки.'),
    c('school_memes', 'Школьные мемы', 'Юмор для чатов.'),
  ],
  rare: [
    c('labelcom', 'LABELCOM', 'Скетчи для Gen Z.'),
    c('impro_show', 'Импровизация', 'Живой юмор и реакции.'),
    c('standup_cut', 'StandUp Cut', 'Панчи коротким форматом.'),
    c('tiktonik', 'ТикТоник', 'Шоу на стыке трендов.'),
  ],
  epic: [
    c('gusschool', 'Гусейн Гасанов', 'Хайп и вирусные моменты.'),
    c('chotkiy', 'Чоткий Паца', 'Пародии и хитовые форматы.'),
    c('slivki', 'SlivkiShow', 'Эксперименты с миллионами просмотров.'),
    c('saveljev', 'Савельев', 'Харизма и регулярный контент.'),
  ],
  legendary: [
    c('ivleeva_show', 'Ивлеева Show', 'Большие выпуски и разговоры.'),
    c('buster_ent', 'Бустер', 'Хайп, который смотрят все.'),
    c('bratishkin_ent', 'Братишкин', 'Постоянно в рекомендациях.'),
    c('mellstroy_ent', 'Mellstroy', 'Эпатаж и бешеные охваты.'),
  ],
  mythic: [
    c('exile_ent', 'EXILE', 'Желанная карточка сцены.'),
    c('nowkiee_ent', 'NOWKIEE', 'Топ узнаваемости Gen Z.'),
    c('karna_ent', 'Карнавал', 'Медийный must-have.'),
    c('milokhin_ent', 'Даня Милохин', 'Икона короткого формата.'),
  ],
};

const ytForeign = {
  common: [
    c('tommyinnit', 'TommyInnit', 'Minecraft-юмор своей волны.'),
    c('dantdm', 'DanTDM', 'Классика gaming для ностальгии.'),
    c('vanoss', 'VanossGaming', 'Кооп-хаос и смех.'),
    c('preston', 'PrestonPlayz', 'Яркий gaming без абсолютного хайпа.'),
  ],
  rare: [
    c('pokimane', 'Pokimane', 'Иконка стриминга.'),
    c('jacksepticeye', 'Jacksepticeye', 'Энергия и комьюнити.'),
    c('markiplier', 'Markiplier', 'Хорроры и огромная фанбаза.'),
    c('dream', 'Dream', 'Minecraft-хайп поколения.'),
  ],
  epic: [
    c('xqc', 'xQc', 'Реакции и бесконечный онлайн.'),
    c('adin_ross', 'Adin Ross', 'Громкие стрим-комнаты.'),
    c('ksi', 'KSI', 'Бокс, клипы и YouTube-империя.'),
    c('sidemen', 'Sidemen', 'Шоу и челленджи UK-сцены.'),
  ],
  legendary: [
    c('ninja', 'Ninja', 'Легенда стримерского мейнстрима.'),
    c('pewdiepie', 'PewDiePie', 'Символ YouTube для Gen Z.'),
    c('caseoh', 'CaseOh', 'Феномен текущего хайпа.'),
    c('travis_scott_yt', 'Travis Scott', 'Кроссовер музыки и стримов.'),
  ],
  mythic: [
    c('ishowspeed', 'IShowSpeed', 'Бешеный хайп — карточку хотят все.'),
    c('kai_cenat', 'Kai Cenat', 'Топ стрим-культуры Gen Z.'),
    c('mrbeast', 'MrBeast', 'Челленджи и рекорды мирового масштаба.'),
    c('twitch_icon', 'Икона стрима', 'Абсолютный статус живого эфира.'),
  ],
};

const ttTrends = {
  common: [
    c('dance_ru', 'Танцор FYP', 'Связки для повторений.'),
    c('sound_hook', 'Саунд-хук', 'Трек недели в ленте.'),
    c('transition', 'Transition Pro', 'Чёткие переходы.'),
    c('caption_hit', 'Текст-хук', 'Первая секунда решает.'),
  ],
  rare: [
    c('mask_lab', 'Маска-тренды', 'Эффекты рекомендаций.'),
    c('duet_chain', 'Цепочка дуэтов', 'Ответы на охваты.'),
    c('pov_trend', 'POV-тренд', 'Сюжеты от первого лица.'),
    c('speed_edit', 'Speed Edit', 'Монтаж под алгоритм.'),
  ],
  epic: [
    c('challenge_week', 'Челлендж недели', 'Формат, который копируют все.'),
    c('green_screen', 'Хромакей-шоу', 'Любой фон — любой панч.'),
    c('trendstarter', 'Трендстартер', 'Кто запускает волну.'),
    c('remix_king', 'Ремикс-кинг', 'Чужие ролики → свой вирус.'),
  ],
  legendary: [
    c('fyp_architect', 'Архитектор FYP', 'Понимает ленту как никто.'),
    c('viral_factory', 'Фабрика вирусов', 'Серия без промахов.'),
    c('karna_trend', 'Карнавал', 'Тренды под большим именем.'),
    c('instasamka_trend', 'Instasamka', 'Музыкальные тренды вертикали.'),
  ],
  mythic: [
    c('exile_tt', 'EXILE', 'Хайп, который задаёт тренды.'),
    c('nowkiee_tt', 'NOWKIEE', 'Must-have карточка TikTok.'),
    c('milokhin_tt', 'Даня Милохин', 'Символ RU TikTok.'),
    c('morgen_tt', 'Моргенштерн', 'Хайп, который уходит в звуки.'),
  ],
};

const ttCreators = {
  common: [
    c('school_creator', 'Школьный креатор', 'Ролики между уроками.'),
    c('dorm_tik', 'Общажный тиктокер', 'Быт и шутки сверстников.'),
    c('gym_edit', 'Gym Edit', 'Спорт-монтаж под саунд.'),
    c('fit_girl', 'Fit Girl RU', 'Мотивация и эстетика.'),
  ],
  rare: [
    c('baimuratov', 'Баймуратов', 'Характер в коротком формате.'),
    c('homyak_tt', 'Хомяк', 'Мемный личный бренд.'),
    c('egor_ship_tt', 'Егор Шип', 'Клипы + тренды.'),
    c('ada_ne_tt', 'Аня Покров', 'Сообщество и регулярность.'),
  ],
  epic: [
    c('karina_kross_tt', 'Карина Кросс', 'Хелленджи и медийный вес.'),
    c('vanya_dmitrienko', 'Ваня Дмитриенко', 'Поп-момент в трендах.'),
    c('annet_sai_tt', 'Annet Sai', 'Визуал Gen Z.'),
    c('gormoney_tt', 'Гормони', 'Стиль в вертикали.'),
  ],
  legendary: [
    c('danya_milokhin_tt', 'Даня Милохин', 'Символ эпохи RU TikTok.'),
    c('karna_tt', 'Карнавал', 'Топ медийности.'),
    c('instasamka_tt', 'Instasamka', 'Музыкальный хайп вертикали.'),
    c('buster_tt', 'Бустер', 'Стримерский хайп в свайпе.'),
  ],
  mythic: [
    c('exile_face', 'EXILE', 'Статус, который хотят все.'),
    c('nowkiee_face', 'NOWKIEE', 'Самое желанное имя сейчас.'),
    c('mellstroy_tt', 'Mellstroy', 'Эпатаж и бесконечные ролики.'),
    c('temnyy_princ_tt', 'Тёмный Принц', 'Культ и мемный топ.'),
  ],
};

const ttHumor = {
  common: [
    c('student_pain', 'Боль студента', 'Сессия в одном свайпе.'),
    c('office_joke', 'Офисный панч', 'Шутки с первой работы.'),
    c('paren_chata', 'Парень из чата', 'Диалоги, которые рвут.'),
    c('cat_owner', 'Хозяин кота', 'Питомцы воруют шоу.'),
  ],
  rare: [
    c('sketch15', 'Скетч 15с', 'Мини-сцены с панчем.'),
    c('dub_voice', 'Озвучка', 'Голос поверх чужого видео.'),
    c('relatable_ru', 'Релейтабл RU', '«Это же про меня».'),
    c('absurd_cut', 'Абсурд-кат', 'Сюр с местным колоритом.'),
  ],
  epic: [
    c('impersonator', 'Пародист', 'Копии звёзд сцены.'),
    c('news_roast', 'Роаст дня', 'Сарказм на злобу ленты.'),
    c('duo_chaos', 'Дуэт-хаос', 'Двое — вдвое смешнее.'),
    c('meme_farm', 'Мем-ферма', 'Шаблоны недели.'),
  ],
  legendary: [
    c('standup_vertical', 'Стендап-верт', 'Панч без большой сцены.'),
    c('meme_lord', 'Мем-лорд', 'Задаёт шаблоны.'),
    c('sketch_king', 'Король скетчей', 'Формат, который копируют.'),
    c('labelcom_tt', 'LABELCOM', 'Скетч-сила для Gen Z.'),
  ],
  mythic: [
    c('exile_humor', 'EXILE', 'Хайп даже в юморе.'),
    c('nowkiee_humor', 'NOWKIEE', 'Имя, которое забирают в коллекцию.'),
    c('karna_humor', 'Карнавал', 'Медийный must-have.'),
    c('morgen_humor', 'Моргенштерн', 'Мемы + хайп = mythic.'),
  ],
};

const ttForeign = {
  common: [
    c('dixie', 'Dixie D’Amelio', 'Семейный бренд без абсолютного топа.'),
    c('noahbeck', 'Noah Beck', 'Эстетика Gen Z.'),
    c('spencerx', 'Spencer X', 'Битбокс-тренды.'),
    c('addison', 'Addison Rae', 'Хайп ранней эпохи.'),
  ],
  rare: [
    c('charli', 'Charli D’Amelio', 'Танцы первой волны.'),
    c('bellapoarch', 'Bella Poarch', 'Вирусный мировой момент.'),
    c('zachking', 'Zach King', 'Магия монтажа.'),
    c('khaby', 'Khaby Lame', 'Молчаливый король реакций.'),
  ],
  epic: [
    c('will_smith', 'Will Smith', 'Голливуд в свайпе.'),
    c('jason_derulo', 'Jason Derulo', 'Музыкальные хуки.'),
    c('xqc_tt', 'xQc', 'Реакции мирового стрима.'),
    c('adin_tt', 'Adin Ross', 'Громкие стрим-комнаты.'),
  ],
  legendary: [
    c('pewdie_tt', 'PewDiePie', 'Легенда, живая в мемах.'),
    c('ninja_tt', 'Ninja', 'Стримерский мейнстрим.'),
    c('ksi_tt', 'KSI', 'Клипы и бокс-хайп.'),
    c('caseoh_tt', 'CaseOh', 'Феномен текущего хайпа.'),
  ],
  mythic: [
    c('ishowspeed_tt', 'IShowSpeed', 'Глобальный хайп — хотят все.'),
    c('kai_cenat_tt', 'Kai Cenat', 'Топ стрим-культуры.'),
    c('mrbeast_tt', 'MrBeast', 'Челленджи мирового масштаба.'),
    c('fyp_world', 'World FYP', 'Символ глобальной ленты.'),
  ],
};

const muRap = {
  common: [
    c('sep047', 'SEP047', 'Свежий поток чартов.'),
    c('uglystephan', 'UglyStephan', 'Новый вайб без статуса иконы.'),
    c('lovv66', 'lovv66', 'Треки в ленте у своих.'),
    c('pluze', 'pluзе', 'Саунд, который заходит с первого раза.'),
  ],
  rare: [
    c('mayot', 'MAYOT', 'Актуальный RU-рэп, который крутит молодёжь.'),
    c('madkid', 'MadKid', 'Свежий хайп сцены.'),
    c('shadowprince_rap', 'Тёмный Принц', 'Мемный топ и узнаваемость.'),
    c('tox_i', 'Toxi$', 'Уличный вайб и хайп.'),
  ],
  epic: [
    c('og_buda', 'OG Buda', 'Звук, разобранный на цитаты.'),
    c('big_baby_tape', 'Big Baby Tape', 'Саундпарк, который не спутать.'),
    c('blago_white', 'Blago White', 'Энергия сцены сейчас.'),
    c('instasamka_rap', 'Instasamka', 'Поп-рэп хайп Gen Z.'),
  ],
  legendary: [
    c('morgenshtern', 'Моргенштерн', 'Хайп, цифры и мемы эпохи.'),
    c('pharaoh', 'PHARAOH', 'Эстетика и культ фанатов.'),
    c('scriptonite', 'Скриптонит', 'Саунд, изменивший вайб.'),
    c('oxxxymiron', 'Oxxxymiron', 'Тексты и культурный вес.'),
  ],
  mythic: [
    c('basta', 'Баста', 'Голос, который знает вся страна.'),
    c('guf', 'Guf', 'Улица и тексты-символы.'),
    c('miyagi_andy', 'Miyagi & Andy Panda', 'Мелодии, ушедшие в народ.'),
    c('kasta', 'Каста', 'Фундамент русскоязычного рэпа.'),
  ],
};

const muPop = {
  common: [
    c('hanna', 'HANNA', 'Яркий поп для плейлистов.'),
    c('aiisha', 'Aisha vibe', 'Свежий слой без абсолютного топа.'),
    c('niletto', 'NILETTO', 'Радио и shorts.'),
    c('maria_kein', 'Поп-слой RU', 'Актуальные хиты второго плана.'),
  ],
  rare: [
    c('jony', 'JONY', 'Лирика в плейлистах молодёжи.'),
    c('anna_asti', 'ANNA ASTI', 'Хиты, которые крутят везде.'),
    c('zivert', 'Zivert', 'Гладкий поп и стабильные релизы.'),
    c('klava_koka', 'Клава Кока', 'Тренды + поп.'),
  ],
  epic: [
    c('artik_asti', 'ARTIK & ASTI', 'Дуэт чартов.'),
    c('monatik', 'MONATIK', 'Сцена и танцы.'),
    c('macan', 'MACAN', 'Хиты, которые знает двор.'),
    c('xolidayboy', 'Xolidayboy', 'Вайб плейлистов сейчас.'),
  ],
  legendary: [
    c('kreed', 'Егор Крид', 'Звезда, которую узнают все.'),
    c('loboda', 'LOBODA', 'Большие шоу и вокал.'),
    c('little_big', 'Little Big', 'Экспорт безумного поп-арта.'),
    c('instasamka_pop', 'Instasamka', 'Хайп Gen Z в поп-оболочке.'),
  ],
  mythic: [
    c('kirkorov', 'Киркоров', 'Шоу-бизнес как система.'),
    c('pugacheva', 'Пугачёва', 'Абсолютный символ эстрады.'),
    c('morgen_pop', 'Моргенштерн', 'Хайп, пересекающий жанры.'),
    c('tatu', 't.A.T.u.', 'Глобальный прорыв RU поп.'),
  ],
};

const muElectronic = {
  common: [
    c('club_edit', 'Club Edit', 'Дропы для stories.'),
    c('house_ru', 'House RU', 'Лёгкий танцпол.'),
    c('bass_short', 'Bass Short', 'Тяжёлый низ за 15 секунд.'),
    c('festival_cut', 'Festival Cut', 'Фестивальный вайб в клипе.'),
  ],
  rare: [
    c('nevada', 'Nevada', 'Мелодичная электроника.'),
    c('moonroom', 'Moonroom', 'Атмосферные сеты.'),
    c('vector_echo', 'Vector Echo', 'Свежий electronic-слой.'),
    c('nightline', 'Nightline', 'Ночные плейлисты.'),
  ],
  epic: [
    c('techno_line', 'Techno Line', 'Глубокий техно-драйв.'),
    c('synth_ru', 'Synthwave RU', 'Ретро-футуризм сцены.'),
    c('rave_pulse', 'Rave Pulse', 'Подпольный вайб.'),
    c('cream_soda', 'Cream Soda', 'Танцпол и узнаваемый саунд.'),
  ],
  legendary: [
    c('diskoteka', 'Дискотека Авария', 'Танцпоп в ДНК радио.'),
    c('ppk', 'ППК', 'Классика RU электроники.'),
    c('ivan_spell', 'Ivan Spell', 'Клубный статус сетов.'),
    c('little_big_el', 'Little Big', 'Электронный хаос на экспорт.'),
  ],
  mythic: [
    c('rave_90', 'Рейв 90-х', 'Миф первой электронной волны.'),
    c('gagarin_party', 'Gagarin Party', 'Космический символ RU rave.'),
    c('skryptonite_el', 'Скриптонит', 'Саунд, ставший эпохой.'),
    c('elec_throne', 'Трон электроники', 'Абсолютный статус жанра.'),
  ],
};

const muForeign = {
  common: [
    c('tyla', 'Tyla', 'Свежий глобальный ритм.'),
    c('ice_spice', 'Ice Spice', 'Хайп-рэп чартов.'),
    c('central_cee', 'Central Cee', 'UK-рэп для Gen Z.'),
    c('sza_cut', 'SZA', 'Треки в плейлистах.'),
  ],
  rare: [
    c('doja', 'Doja Cat', 'Мемы + талант.'),
    c('oliviarodrigo', 'Olivia Rodrigo', 'Голос подростковых чартов.'),
    c('dua_lipa', 'Dua Lipa', 'Танцпоп десятилетия.'),
    c('postmalone', 'Post Malone', 'Кроссовер жанров.'),
  ],
  epic: [
    c('drake', 'Drake', 'Стандарт глобального поп-рэпа.'),
    c('travis', 'Travis Scott', 'Саунд фестивалей.'),
    c('billie', 'Billie Eilish', 'Новая школа глобального попа.'),
    c('the_weeknd', 'The Weeknd', 'Тёмная поп-волна мира.'),
  ],
  legendary: [
    c('beyonce', 'Beyoncé', 'Абсолютная сцена.'),
    c('kendrick', 'Kendrick Lamar', 'Тексты и премии.'),
    c('taylor', 'Taylor Swift', 'Эра-культура и фанаты.'),
    c('badbunny', 'Bad Bunny', 'Глобальный стриминг-вайб.'),
  ],
  mythic: [
    c('ishowspeed_mu', 'IShowSpeed', 'Хайп Gen Z вне музыки — want-card.'),
    c('kai_mu', 'Kai Cenat', 'Стрим-культура как mythic.'),
    c('mrbeast_mu', 'MrBeast', 'Мировой must-have хайпа.'),
    c('mj', 'Michael Jackson', 'Король попа.'),
  ],
};

const permanent = {
  id: 'permanent',
  name: 'Постоянные',
  type: 'permanent',
  order: 1,
  enabled: true,
  shelves: [
    {
      id: 'youtube',
      name: 'YouTube',
      standId: 'permanent',
      order: 1,
      enabled: true,
      books: [
        makeBook('games', 'Игры', 'common', 'youtube', 1, ytGames, 'yt-games'),
        makeBook('lifestyle', 'Лайфстайл', 'rare', 'youtube', 2, ytLifestyle, 'yt-life'),
        makeBook('entertainment', 'Развлечения', 'epic', 'youtube', 3, ytEntertainment, 'yt-ent'),
        makeBook('foreign', 'Иностранные', 'legendary', 'youtube', 4, ytForeign, 'yt-foreign'),
      ],
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      standId: 'permanent',
      order: 2,
      enabled: true,
      books: [
        makeBook('trends', 'Тренды', 'common', 'tiktok', 1, ttTrends, 'tt-trends'),
        makeBook('creators', 'Креаторы', 'rare', 'tiktok', 2, ttCreators, 'tt-creators'),
        makeBook('humor', 'Юмор', 'epic', 'tiktok', 3, ttHumor, 'tt-humor'),
        makeBook('foreign', 'Иностранные', 'legendary', 'tiktok', 4, ttForeign, 'tt-foreign'),
      ],
    },
    {
      id: 'music',
      name: 'Музыка',
      standId: 'permanent',
      order: 3,
      enabled: true,
      books: [
        makeBook('rap', 'Рэп', 'common', 'music', 1, muRap, 'mu-rap'),
        makeBook('pop', 'Поп', 'rare', 'music', 2, muPop, 'mu-pop'),
        makeBook('electronic', 'Электроника', 'epic', 'music', 3, muElectronic, 'mu-elec'),
        makeBook('foreign', 'Иностранные', 'legendary', 'music', 4, muForeign, 'mu-foreign'),
      ],
    },
  ],
};

const data = {
  stands: [
    permanent,
    { id: 'seasonal', name: 'Сезонные', type: 'seasonal', order: 2, enabled: true, shelves: [] },
    { id: 'collab', name: 'Коллаборации', type: 'collab', order: 3, enabled: true, shelves: [] },
    { id: 'event', name: 'События', type: 'event', order: 4, enabled: true, shelves: [] },
    { id: 'collectible', name: 'Коллекционные', type: 'collectible', order: 5, enabled: true, shelves: [] },
  ],
};

const ids = new Set();
let cards = 0;
for (const stand of data.stands) {
  for (const shelf of stand.shelves || []) {
    for (const book of shelf.books) {
      if (book.pages.length !== 5) throw new Error(`pages ${book.id}`);
      for (const page of book.pages) {
        if (page.cards.length !== 4) throw new Error(`cards ${page.id}`);
        for (const card of page.cards) {
          if (card.rarity !== page.rarity) throw new Error(`rarity ${card.id}`);
          if (ids.has(card.id)) throw new Error(`dup ${card.id}`);
          ids.add(card.id);
          cards++;
        }
      }
    }
  }
}

fs.writeFileSync(new URL('../src/data/content.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
console.log('OK cards', cards);
const ytForeignMythic = data.stands[0].shelves[0].books[3].pages[4].cards.map((x) => x.name);
const rapRare = data.stands[0].shelves[2].books[0].pages[1].cards.map((x) => x.name);
const rapMythic = data.stands[0].shelves[2].books[0].pages[4].cards.map((x) => x.name);
console.log('YT foreign mythic:', ytForeignMythic.join(', '));
console.log('Rap rare:', rapRare.join(', '));
console.log('Rap mythic:', rapMythic.join(', '));
