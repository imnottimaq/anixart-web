import { useState, type ComponentProps } from 'react';
import { useSettings } from '../shared/contexts/settingsContext';

type RemoteImageProps = Omit<ComponentProps<'img'>, 'src'> & {
    src?: string | null;
};

function normalizeUrl(url: string) {
    return url.startsWith('//') ? `https:${url}` : url;
}

function getMirrorUrl(url: string) {
    return normalizeUrl(url).replace(
        /^https:\/\/s\.anixmirai\.com\//,
        'https://mirror-s.anixmirai.com/',
    );
}

function getOptimizedUrl(url: string) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

export default function RemoteImage({ src, onError, ...props }: RemoteImageProps) {
    const { settings } = useSettings();
    const [failedSource, setFailedSource] = useState<string | null>(null);
    const originalUrl = src ? normalizeUrl(src) : '';
    const mirrorUrl = originalUrl.includes('s.anixmirai.com/') ? getMirrorUrl(originalUrl) : null;
    const isUsingMirror = failedSource === originalUrl;
    const useImageProxy = settings.content.proxyImages;

    if (!originalUrl) return null;

    return <img
        {...props}
        src={isUsingMirror && mirrorUrl ? mirrorUrl : useImageProxy ? getOptimizedUrl(originalUrl) : originalUrl}
        onError={event => {
            if (!isUsingMirror && mirrorUrl && !useImageProxy) {
                setFailedSource(originalUrl);
                return;
            }
            onError?.(event);
        }}
    />;
}
