package com.notebloom.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.StringUtils;

/**
 * LINE Login channel from the LINE Developers console. Leaving the channel ID or secret empty turns LINE Login off.
 * The endpoint URLs only need changing for tests.
 */
@ConfigurationProperties("notebloom.line")
public record LineLoginProperties(
        String channelId,
        String channelSecret,
        @DefaultValue("https://access.line.me/oauth2/v2.1/authorize") String authorizationUri,
        @DefaultValue("https://api.line.me/oauth2/v2.1/token") String tokenUri,
        @DefaultValue("https://api.line.me/v2/profile") String profileUri
) {
    public boolean enabled() {
        return StringUtils.hasText(channelId) && StringUtils.hasText(channelSecret);
    }
}
