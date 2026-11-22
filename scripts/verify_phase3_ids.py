buy_ids = [
    'marketplaceCurrencySwitcher', 'compareTray', 'compareThumbs', 'compareCountBadge', 
    'escrowBuyModal', 'escrowModalTitle', 'escrowPropId', 'escrowBuyerName', 
    'escrowBuyerEmail', 'escrowOfferAmount', 'escrowChannel', 'escrowDepositHint', 'escrowSubmitBtn'
]
buy_txt = open('templates/buy.html', encoding='utf-8').read()
missing_buy = [i for i in buy_ids if f'id="{i}"' not in buy_txt and f"id='{i}'" not in buy_txt]
print('Missing buy IDs:', len(missing_buy), missing_buy)

detail_ids = [
    'evMasterPhoto', 'detailBookmarkBtn', 'detailEscrowModal', 'detailOfferInput', 
    'detailSettlementChannel', 'detailJpgInput', 'downPaymentPctDisplay', 'fvEstimatedValue', 
    'fvSpread', 'fvPricePerSqm', 'fairValueVerdict', 'fairValueDelta', 'tcPrice', 
    'tcTransferTax', 'tcNotary', 'tcTotalOutlay', 'tcMonthlyMortgage', 'tcAnnualTax', 
    'tcAnnualMaint', 'tcFiveYearCarry', 'schedulerSection', 'viewingDate'
]
detail_txt = open('templates/property_detail.html', encoding='utf-8').read()
missing_detail = [i for i in detail_ids if f'id="{i}"' not in detail_txt and f"id='{i}'" not in detail_txt]
print('Missing detail IDs:', len(missing_detail), missing_detail)

if len(missing_buy) == 0 and len(missing_detail) == 0:
    print('ALL REQUIRED PHASE 3 JS HOOKS / IDS ARE 100% PRESERVED!')
