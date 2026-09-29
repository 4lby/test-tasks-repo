<?php

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

/** @var array $arParams */
/** @var array $arResult */
/** @var CBitrixComponentTemplate $this */

$this->addExternalCss($this->GetFolder() . '/style.css');

if (empty($arResult['ITEMS'])) {
    return;
}

?>

<div class="promo-cards">
    <?php foreach ($arResult['ITEMS'] as $arItem): ?>
        <div class="promo-card">
            <?php if (!empty($arItem['PREVIEW_PICTURE']['SRC'])): ?>
                <div class="promo-card__image">
                    <img
                        src="<?= $arItem['PREVIEW_PICTURE']['SRC'] ?>"
                        alt="<?= htmlspecialcharsbx($arItem['NAME']) ?>"
                        loading="lazy"
                    >
                </div>
            <?php endif; ?>

            <div class="promo-card__body">
                <div class="promo-card__badges">
                    <?php if ($arItem['IS_HOT']): ?>
                        <span class="promo-card__badge promo-card__badge--hot">🔥 Заканчивается!</span>
                    <?php endif; ?>

                    <span class="promo-card__badge promo-card__badge--default">
                        <?= htmlspecialcharsbx($arItem['BADGE']) ?>
                    </span>
                </div>

                <?php if (!empty($arItem['NAME'])): ?>
                    <h3 class="promo-card__title">
                        <a href="<?= $arItem['DETAIL_PAGE_URL'] ?>">
                            <?= htmlspecialcharsbx($arItem['NAME']) ?>
                        </a>
                    </h3>
                <?php endif; ?>

                <?php if (!empty($arItem['PREVIEW_TEXT'])): ?>
                    <p class="promo-card__description">
                        <?= htmlspecialcharsbx($arItem['PREVIEW_TEXT']) ?>
                    </p>
                <?php endif; ?>

                <?php
                $discount = (int) $arItem['PROPERTIES']['DISCOUNT_PERCENT']['VALUE'];
                if ($discount > 0): ?>
                    <span class="promo-card__discount">-<?= $discount ?>%</span>
                <?php endif; ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>