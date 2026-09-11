"""Tarot card content for the daily money-card experience."""

TAROT_CARDS = [
    {"id":"temperance","title":"절제","en":"TEMPERANCE","symbol":"⚖️","score":72,"status":"안정","flow":"오늘은 크게 움직이기보다 지출과 저축의 균형을 맞출수록 흐름이 좋아집니다.","caution":"기분에 따른 즉흥 결제는 한 번 더 생각해보세요.","line":"덜 쓰는 선택이 오늘의 여유를 만듭니다."},
    {"id":"expense","title":"지출","en":"EXPENSE","symbol":"🧾","score":48,"status":"주의","flow":"예상하지 못한 작은 지출이 겹치기 쉬운 날입니다. 필요한 것과 원하는 것을 구분해보세요.","caution":"소액 결제가 반복되면 체감보다 큰 금액이 될 수 있어요.","line":"오늘은 결제 전 한 번 멈추는 것이 이득입니다."},
    {"id":"income","title":"수익","en":"INCOME","symbol":"💰","score":84,"status":"좋음","flow":"수입이나 보상과 관련된 반가운 흐름이 들어옵니다. 작은 기회도 놓치지 마세요.","caution":"들어온 만큼 바로 소비하지 않는 것이 중요합니다.","line":"들어오는 돈보다 남기는 돈에 집중하세요."},
    {"id":"investment","title":"투자","en":"INVESTMENT","symbol":"📈","score":67,"status":"관찰","flow":"새로운 가능성이 보이지만 오늘은 실행보다 정보 확인과 비교가 유리합니다.","caution":"확신보다 분위기에 끌린 결정은 피하세요.","line":"좋은 투자는 서두르지 않는 판단에서 시작됩니다."},
    {"id":"opportunity","title":"기회","en":"OPPORTUNITY","symbol":"🔑","score":88,"status":"상승","flow":"돈과 연결될 수 있는 새로운 제안이나 선택지가 눈에 들어올 수 있습니다.","caution":"조건을 확인하지 않은 채 좋은 면만 보지 마세요.","line":"기회는 잡되 조건은 꼼꼼히 확인하세요."},
    {"id":"warning","title":"경고","en":"WARNING","symbol":"⚠️","score":38,"status":"주의","flow":"오늘은 공격적인 선택보다 자산을 지키는 쪽이 유리한 흐름입니다.","caution":"충동구매와 검증되지 않은 제안을 특히 조심하세요.","line":"오늘의 수익은 잃지 않는 것에서 시작됩니다."},
    {"id":"crisis","title":"위기","en":"CRISIS","symbol":"🌧️","score":32,"status":"방어","flow":"예상 밖 변수에 대비할 필요가 있습니다. 현금 흐름과 예정 지출을 먼저 확인하세요.","caution":"불안해서 성급하게 결정하지 마세요.","line":"지금은 버티는 선택도 좋은 선택입니다."},
    {"id":"response","title":"대응","en":"RESPONSE","symbol":"🛡️","score":64,"status":"회복","flow":"문제가 생겨도 빠르게 정리할 수 있는 날입니다. 우선순위를 세우면 흐름이 안정됩니다.","caution":"한꺼번에 모든 문제를 해결하려 하지 마세요.","line":"하나씩 정리하면 돈의 흐름도 다시 안정됩니다."},
    {"id":"loss","title":"손실","en":"LOSS","symbol":"📉","score":35,"status":"방어","flow":"작은 손해를 피하려다 더 큰 비용을 만들지 않도록 냉정한 판단이 필요합니다.","caution":"이미 쓴 돈에 집착해 추가 지출하지 마세요.","line":"손절해야 할 비용을 구분하는 것도 재물운입니다."},
    {"id":"temptation","title":"유혹","en":"TEMPTATION","symbol":"🛍️","score":44,"status":"주의","flow":"사고 싶은 것이 유난히 매력적으로 보일 수 있습니다. 오늘의 만족과 내일의 예산을 함께 보세요.","caution":"세일 문구와 한정 판매에 흔들리지 마세요.","line":"안 사도 괜찮다면 오늘은 지나쳐도 됩니다."},
    {"id":"flow","title":"흐름","en":"FLOW","symbol":"🌊","score":76,"status":"순항","flow":"막혀 있던 금전 흐름이 조금씩 자연스러워집니다. 무리하지 않는 선택이 좋습니다.","caution":"좋은 흐름을 과신해 지출을 늘리지 마세요.","line":"돈의 흐름을 억지로 만들기보다 잘 타는 날입니다."},
    {"id":"choice","title":"선택","en":"CHOICE","symbol":"🧭","score":62,"status":"판단","flow":"비슷해 보이는 두 선택 사이에서 장기적인 이익을 보는 것이 중요합니다.","caution":"가격만 보고 결정하지 말고 유지 비용까지 확인하세요.","line":"싼 선택보다 오래 남는 선택을 보세요."},
    {"id":"change","title":"변화","en":"CHANGE","symbol":"🍃","score":70,"status":"전환","flow":"소비 습관이나 돈 관리 방식을 바꾸기에 좋은 타이밍입니다.","caution":"한 번에 너무 큰 변화를 만들 필요는 없습니다.","line":"작은 습관 하나가 다음 달의 흐름을 바꿉니다."},
    {"id":"plan","title":"계획","en":"PLAN","symbol":"🗺️","score":74,"status":"안정","flow":"예산과 목표를 숫자로 정리할수록 마음과 재정이 함께 편안해집니다.","caution":"계획만 세우고 실행을 미루지 마세요.","line":"오늘 10분의 계획이 이번 달을 편하게 합니다."},
    {"id":"balance","title":"균형","en":"BALANCE","symbol":"☯️","score":78,"status":"안정","flow":"쓰는 돈과 모으는 돈 사이의 균형이 잘 맞는 날입니다.","caution":"한쪽에 지나치게 치우친 선택만 피하세요.","line":"잘 쓰고 잘 남기는 것이 오늘의 핵심입니다."},
    {"id":"hope","title":"희망","en":"HOPE","symbol":"✨","score":82,"status":"상승","flow":"답답했던 재정 고민에서 새로운 가능성을 발견할 수 있습니다.","caution":"기대만으로 숫자를 낙관하지는 마세요.","line":"가능성은 보이기 시작했고 이제 작은 실행이 필요합니다."},
    {"id":"success","title":"성공","en":"SUCCESS","symbol":"🏆","score":92,"status":"매우 좋음","flow":"노력해온 일에서 금전적 보상이나 만족스러운 결과를 기대해볼 수 있습니다.","caution":"성과를 이유로 과소비하지 마세요.","line":"좋은 결과를 즐기되 다음 기회도 남겨두세요."},
    {"id":"greed","title":"욕심","en":"GREED","symbol":"💎","score":41,"status":"주의","flow":"조금 더 얻고 싶은 마음이 판단을 흐릴 수 있습니다. 충분함의 기준을 정해보세요.","caution":"고수익이라는 말만으로 위험을 감수하지 마세요.","line":"더 얻는 것보다 이미 가진 것을 지키는 날입니다."},
    {"id":"judgment","title":"판단","en":"JUDGMENT","symbol":"🔍","score":73,"status":"판단","flow":"자료와 숫자를 차분하게 보면 좋은 결정을 내릴 수 있는 날입니다.","caution":"주변의 확신을 내 판단으로 착각하지 마세요.","line":"오늘은 감보다 근거가 돈을 지켜줍니다."},
    {"id":"focus","title":"집중","en":"FOCUS","symbol":"🎯","score":79,"status":"좋음","flow":"여러 목표보다 하나의 재정 목표에 집중할수록 성과가 커집니다.","caution":"새로운 일을 계속 벌이지 마세요.","line":"하나를 끝내는 힘이 오늘의 재물운입니다."},
    {"id":"luck","title":"행운","en":"LUCK","symbol":"🍀","score":90,"status":"행운","flow":"예상하지 못한 작은 혜택이나 좋은 타이밍을 만날 가능성이 있습니다.","caution":"행운을 이유로 무리한 베팅을 하지는 마세요.","line":"작은 행운은 즐기고 큰 결정은 평소 기준대로 하세요."},
    {"id":"timing","title":"타이밍","en":"TIMING","symbol":"⏳","score":81,"status":"기회","flow":"미뤄왔던 금전 관련 결정이나 정리를 실행하기 좋은 타이밍입니다.","caution":"급하게 움직이는 것과 제때 움직이는 것은 다릅니다.","line":"준비했다면 오늘은 한 걸음 움직여도 좋습니다."},
    {"id":"saving","title":"저축","en":"SAVING","symbol":"🐷","score":77,"status":"안정","flow":"작은 금액이라도 남겨두는 행동이 만족감을 크게 만드는 날입니다.","caution":"목표 없이 무조건 아끼다가 필요한 지출까지 미루지 마세요.","line":"오늘 남긴 작은 돈이 미래의 선택지를 늘립니다."},
    {"id":"growth","title":"성장","en":"GROWTH","symbol":"🌱","score":86,"status":"상승","flow":"당장의 큰 변화보다 꾸준히 쌓아온 습관에서 재정적 성장이 보입니다.","caution":"빠른 결과를 위해 무리하게 속도를 높이지 마세요.","line":"천천히 커지는 돈의 힘을 믿어도 좋은 날입니다."},
]

# Production artwork follows the canonical card order above.
for index, card in enumerate(TAROT_CARDS, start=1):
    card["image"] = f"images/tarot/app_cards/tarot_{index:02d}_{card['id']}.png"
