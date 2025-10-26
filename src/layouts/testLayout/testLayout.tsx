import { useContext, useEffect, useRef, useState, type FC } from 'react';
import { ColorPicker } from '../../components/colorPicker/colorPicker';
import { DailyNote } from '../../components/dailyNote/dailyNote';
import { ThemeSwitcher } from '../../components/themeSwitcher/themeSwitcher';
import { AppContext } from '../../contexts/appContext/appContext';
import style from './testLayout.module.css';

export const TestLayout: FC = () => {
    const { settings } = useContext(AppContext);

    const [note, setNote] = useState(`

Prow scuttle parrel provost Sail ho shrouds spirits boom mizzenmast yardarm. Pinnace holystone mizzenmast quarter crow's nest nipperkin grog yardarm hempen halter furl. Swab barque interloper chantey doubloon starboard grog black jack gangway rutters.

Deadlights jack lad schooner scallywag dance the hempen jig carouser broadside cable strike colors. Bring a spring upon her cable holystone blow the man down spanker Shiver me timbers to go on account lookout wherry doubloon chase. Belay yo-ho-ho keelhaul squiffy black spot yardarm spyglass sheet transom heave to.

Trysail Sail ho Corsair red ensign hulk smartly boom jib rum gangway. Case shot Shiver me timbers gangplank crack Jennys tea cup ballast Blimey lee snow crow's nest rutters. Fluke jib scourge of the seven seas boatswain schooner gaff booty Jack Tar transom spirits.
`);

    const colors: string[] = [
        '--bg-dark',
        '--bg',
        '--bg-light',
        '--gradient',
        '--gradient-hover',
        '--text',
        '--text-muted',
        '--highlight',
        '--border',
        '--border-muted',
        '--border-card',
        '--primary',
        '--secondary',
        '--danger',
        '--warning',
        '--success',
        '--info',
    ];

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    };

    const [noteCount, setNoteCount] = useState(5);
    const intervalRef = useRef<number | null>(null);
    useEffect(() => {
        console.log('MiMu noteCount');

        intervalRef.current = setInterval(() => {
            setNoteCount((prev) => prev + 1);
        }, 1500);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (noteCount >= 20 && intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }, [noteCount]);

    const arrayFrom = Array.from({ length: noteCount }).map((_, i) => i + 1);

    return (
        <div className={style.container}>
            <div className={style['top-bar']}>
                <button
                    id="settings-popover-button"
                    popoverTarget="settings-popover"
                >
                    Settings
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        scrollBottom();
                    }}
                >
                    Bottom
                </button>
                <div
                    ref={(el) => {
                        el?.setAttribute('anchor', 'settings-popover-button');
                    }}
                    popover="auto"
                    id="settings-popover"
                    style={{ top: 'anchor(bottom)', left: 'anchor(left)' }}
                >
                    <ThemeSwitcher
                        colorScheme={settings.colorScheme}
                        setColorScheme={(scheme) => settings.setColorScheme(scheme)}
                    />
                    <br />
                    <label>
                        Use custom color
                        <input
                            type="checkbox"
                            checked={settings.useCustomColor}
                            onChange={(e) => settings.setUseCustomColor(e.currentTarget.checked)}
                        />
                    </label>

                    <ColorPicker
                        customColor={settings.customColor}
                        setCustomColor={(color) => settings.setCustomColor(color)}
                        disabled={!settings.useCustomColor}
                    />
                </div>
            </div>
            <div className={style['content']}>
                <div ref={scrollRef}>
                    <div>
                        <h1>Minimalistic diary</h1>
                        <div className={style['color-samples']}>
                            {colors.map((color) => (
                                <div key={color}>
                                    <div
                                        style={{
                                            backgroundColor: `var(${color})`,
                                            width: '50px',
                                            height: '50px',
                                            ...(color.includes('border')
                                                ? { outline: color, backgroundColor: 'var(--bg-dark)' }
                                                : {}),
                                        }}
                                    />
                                    {color}
                                </div>
                            ))}
                        </div>
                        <div>
                            {arrayFrom.map((i) => (
                                <DailyNote
                                    key={i + 1}
                                    date={new Date()}
                                    note={note}
                                    onChange={(newNote) => setNote(newNote)}
                                    daysInRow={i + 1}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
