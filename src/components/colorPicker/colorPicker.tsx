import { useMemo, useRef, type FC } from 'react';
import type { ThemeSettings } from '../../hooks/useColorTheme';
import style from './colorPicker.module.scss';

const CHROMA = '0.2';
const HUE = '20';

export const ColorPicker: FC<
    Pick<ThemeSettings, 'customColor' | 'setCustomColor'> & Pick<HTMLInputElement, 'disabled'>
> = ({ customColor, setCustomColor, disabled }) => {
    const chromaRef = useRef<HTMLInputElement>(null);
    const hueRef = useRef<HTMLInputElement>(null);

    const changeColor = () => {
        const chroma = chromaRef.current?.value ?? CHROMA;
        const hue = hueRef.current?.value ?? HUE;

        setCustomColor(`oklch(0 ${chroma} ${hue})`);
    };

    const [chroma, hue] = useMemo(() => {
        return customColor
            ? customColor.match(/oklch\(0 (\d*\.?\d*) (\d*\.?\d*)\)/)?.slice(1) ?? [CHROMA, HUE]
            : [CHROMA, HUE];
    }, [customColor]);

    return (
        <div className={style.sliders}>
            {!disabled && (
                <>
                    <label className="slider-label">
                        <span>Neutral</span>
                        <input
                            ref={chromaRef}
                            type="range"
                            id="chroma-slider"
                            min="0"
                            max=".2"
                            step="0.01"
                            value={chroma}
                            className="slider"
                            onChange={changeColor}
                            disabled={disabled}
                        />
                        <span>Vivid</span>
                    </label>
                    <label className="slider-label">
                        <span>Warmer</span>
                        <input
                            ref={hueRef}
                            type="range"
                            id="hue-slider"
                            min="20"
                            max="340"
                            value={hue}
                            className="slider"
                            onChange={changeColor}
                            disabled={disabled}
                        />
                        <span>Cooler</span>
                    </label>
                </>
            )}
        </div>
    );
};
