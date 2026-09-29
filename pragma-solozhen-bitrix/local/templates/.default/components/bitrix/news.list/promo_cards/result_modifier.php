<?php

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

/** @var array $arParams */
/** @var array $arResult */

// Порог для флага IS_HOT (в днях): акция "горит", если до конца осталось меньше 3 дней.
$hotDaysThreshold = 3;

// Скидка (в процентах), выше которой бейдж считается "Суперцена".
$superPriceThreshold = 20;

foreach ($arResult['ITEMS'] as $key => $arItem) {
    // Дата окончания акции у элемента хранится в поле ACTIVE_TO формата DD.MM.YYYY HH:MI:SS
    $activeTo = MakeTimeStamp($arItem['ACTIVE_TO'], 'DD.MM.YYYY HH:MI:SS');
    $daysLeft = $activeTo > 0 ? ($activeTo - time()) / 86400 : 0;

    $arItem['IS_HOT'] = $activeTo > 0 && $daysLeft < $hotDaysThreshold;

    // Скидка в процентах — числовое свойство инфоблока
    $discountPercent = (int) $arItem['PROPERTIES']['DISCOUNT_PERCENT']['VALUE'];

    // Бейдж определяется размером скидки, собственное значение свойства не используется напрямую
    $arItem['BADGE'] = $discountPercent > $superPriceThreshold ? 'Суперцена' : 'Выгода';

    $arResult['ITEMS'][$key] = $arItem;
}

unset($key, $arItem);
