"""Writes the Prologue expansion's JSON content (doc 51 v1.0). Values carry {value, grade, source} like the existing files.
Usage: npm run content:prologue-expansion  (python3 -I tools/prologue/gen_content.py; writes into docs/prologue-expansion-content/)"""
import json
OUT = __file__.rsplit('/tools/', 1)[0] + '/docs/prologue-expansion-content'
def V(value, grade, source): return {'value': value, 'grade': grade, 'source': source}
LIVE = __file__.rsplit('/tools/', 1)[0] + '/src/content'
LIVE_COPIES = {'pools_player.json'}  # the files the game reads as they are (a test checks the copy is identical); M69.2
def save(name, obj):
    for d in ([OUT, LIVE] if name in LIVE_COPIES else [OUT]):
        with open(f'{d}/{name}', 'w') as f: json.dump(obj, f, indent=1, ensure_ascii=False); f.write('\n')

save('machines_scrypt.json', {
 'schema_version': 1,
 'notes': "Adds a scrypt hashrate to existing GPU models in machines_prologue.json. Power draw stays the existing power_kw (the existing file wins over doc 53's 200 W figure). FPGAs and BTC ASICs have no scrypt rate. No scrypt ASIC is buyable in the shop (doc 51 v1.0 §5); the only scrypt box is the club card club_scrypt_box.",
 'models': {
  'gpu_gaming_2010': {'scrypt_khs': V(400, 'B/D', 'doc 53 A3: HD 5870 400-442 kH/s, Litecoin wiki [B]; 400 chosen [D]'), 'available_scrypt_from': '2011Q4'},
  'gpu_eth_2015': {'scrypt_khs': V(3400, 'B/D', 'doc 53 A3: 4 x R9 290X at 850 kH/s (860-900 sourced, CoinDesk Dec 2013) [B]'), 'available_scrypt_from': '2015Q3'}}})

save('pools_player.json', {
 'schema_version': 1,
 'notes': 'Run your own pool (doc 51 v1.0 §3). BTC only. Real pools fee rows live in custody.json (see custody_additions.json). Costs and probabilities are designed [D] unless graded otherwise.',
 'unlock': {'quarter': '2011Q2', 'requires_site_tier_min': 'home_rig', 'grade': 'D', 'source': 'pools exist from 2010Q4 (custody.json)'},
 'open_action': {'bandwidth': 1, 'setup_cash_usd': V(300, 'D', 'about 20 hours of setup plus a first month of hosting (doc 53 B3)')},
 'server_bill_usd_quarter': {'2011': V(180, 'D', 'doc 53 B3: $60 a month'), '2012': V(150, 'D', 'interpolated'), '2013': V(120, 'D', 'doc 53 B3: $40 a month'), '2014': V(105, 'D', 'interpolated'), '2015': V(90, 'D', 'doc 53 B3: $30 a month'), '2016': V(90, 'D', 'held')},
 'ddos_protection': {'action_bandwidth': 1, 'available_from': '2013Q1', 'usd_quarter': {'2013': V(240, 'D', 'doc 53 B3: $80 a month'), '2015': V(150, 'D', 'doc 53 B3: $50 a month')}, 'effect': 'halves the DDoS chance'},
 'cold_storage': {'action_bandwidth': 1, 'cash_usd': 0, 'effect': 'theft chance falls to hot_wallet_theft_with_cold_storage', 'lapses': 'never'},
 'payout_methods': {
  'PPLNS': {'fee_range': [0.0, 0.03], 'operator_carries_variance': False, 'grade': 'D', 'source': 'doc 53 B1/B3'},
  'PPS': {'fee_range': [0.02, 0.10], 'operator_carries_variance': True, 'reserve_rule': 'PPS can be chosen only while cash covers 3 x sqrt(expected pool blocks per week) block rewards; below 0 cash under PPS, 50% of outside miners leave each week and reputation -30', 'grade': 'D', 'source': 'doc 53 B3'}},
 'change_settings_bandwidth': 1,
 'outside_miners': {
  'model': 'outside hashrate = network hashrate x small_pool_share[year] x pull; pull starts at start_pull and moves each quarter with fee, luck and reputation, minus churn',
  'small_pool_share_by_year': {y: V(v, 'D', 'placeholder; second research pass') for y, v in (('2011', 0.30), ('2012', 0.25), ('2013', 0.15), ('2014', 0.10), ('2015', 0.08), ('2016', 0.05))},
  'start_pull': V(0.005, 'D', 'a new pool gets 0.5% of the small-pool market'),
  'fee_elasticity_per_pp': V(-0.08, 'D', 'doc 53 B3: -8% hashrate per +1 pp fee against the median'),
  'median_fee_by_year': {'2011': 0.02, '2012': 0.02, '2013': 0.01, '2014': 0.01, '2015': 0.015, '2016': 0.015, 'grade': 'D', 'source': 'custody.json fee_pct_by_year and doc 53 B1, rounded'},
  'base_churn_quarter': V(0.05, 'D', 'designed'),
  'luck_memory_weeks': V(4, 'D', 'doc 53 B3'),
  'bad_luck_spiral': V('after 3 unlucky weeks in a row under PPLNS, -15% outside hashrate each further unlucky week', 'D', 'doc 53 B3'),
  'reputation': {'start': 50, 'range': [0, 100], 'up': '+5 a quarter with no outage or theft', 'down': 'outage -15, theft -30, PPS insolvency -30', 'pull_mult': '0.5 + reputation / 100'}},
 'risks_per_quarter': {
  'ddos': V(0.03, 'D', 'small pools were hit far less than big ones: 7 of 41 small pools over May 2011-Oct 2013 (Vasek, Thornton, Moore, FC 2014 [A]); about 3% a quarter'),
  'ddos_outage_hours': V([2, 48], 'D', 'doc 53 B3'), 'ddos_outside_hashrate_loss': V(0.20, 'D', 'doc 53 B3'),
  'hot_wallet_theft': V(0.01, 'D', 'real cases: 3,094 BTC on 1 Mar 2012 and 923 BTC on 19 Apr 2013 [B]'),
  'hot_wallet_theft_with_cold_storage': V(0.002, 'D', 'doc 53 B3'),
  'theft_size': V('one week of outside miners payouts; under PPS the operator still owes them', 'D', 'designed'),
  'orphan_rate': V({'2011': 0.02, '2013': 0.01, '2016': 0.0041}, 'A/D', 'Feb 2016 0.41% [A]; earlier years designed')},
 'boycott_2014': {'window': ['2014Q2', '2014Q3'], 'condition': 'pool open, fee at or below the median, reputation >= 50', 'outside_hashrate_mult': V(1.3, 'D', 'miners spread from the largest pool after June 2014 (custody.json note); size designed, second research pass'), 'card': 'pool_boycott_2014'},
 'sale': {'from_quarter': '2013Q1', 'price': 'trailing four quarters of fee income x multiple', 'multiple': V(2.0, 'D', 'no sourced small-pool sale found (doc 53)'), 'at_handover': 'an open pool is sold automatically at this price (owner, doc 51 §8)'},
 'names': {'default_pool_name': 'Halfblock Pool', 'rivals': ['OreLoop', 'CopperHash'], 'grade': 'D', 'note': 'invented; name-clash check before shipping'}})

save('club.json', {
 'schema_version': 1,
 'notes': "The mining club (doc 51 v1.0 §4). Three invented friends; the club buys into the existing group buy (preorders.json group_buy) and runs Teo's two GPUs. Designed [D]; the backdrop cards are sourced.",
 'offer': {'card': 'club_form', 'quarter': '2013Q1', 'join_bandwidth': 1},
 'cast': [
  {'id': 'mara', 'name': 'Mara Ilves', 'role': 'electrical engineering student; watches the wiring'},
  {'id': 'teo', 'name': 'Teo Brandt', 'role': 'gamer; brings two 2010-class GPUs'},
  {'id': 'jun', 'name': 'Jun Okafor', 'role': 'economics student; keeps the spreadsheet and, if asked, the keys'}],
 'friends_cash_usd': V(3000, 'D', 'the three together'),
 'player_contribution_usd': {'min': 500, 'max': 5000, 'step': 500, 'grade': 'D'},
 'teo_gpus': {'model': 'gpu_gaming_2010', 'count': 2, 'valued_at': 'used price at joining', 'grade': 'D'},
 'shares': "by value put in (cash plus Teo's GPUs at used price)",
 'buys': {'vendor': 'group_buy', 'how': 'all pooled cash goes into the group buy at its price; its delay roll and the late-equals-loss rule apply'},
 'keys': {'choice': ['player', 'jun'], 'player': 'club coins sit in your wallet: your wallet-loss and backup rules cover them',
          'jun': {'loss_chance_quarter': V(0.015, 'D', 'no failure-rate source found (doc 53 Part C); about 15% over the club life'), 'loss_share': V([0.3, 1.0], 'D', 'doc 53 range')}},
 'hosting': {'choice': ['your_place', 'friends_flat'],
             'your_place': {'counts_against_household_patience': True, 'fee_from_club_usd_kw_quarter': V(60, 'D', 'no hobbyist hosting price found')},
             'friends_flat': {'counts_against_household_patience': False, 'fee_to_mara_usd_kw_quarter': V(60, 'D', 'same')}},
 'gpus_coin': "the club's GPUs follow the coin the player picks for them (BTC, LTC or DOGE)",
 'endings': {'early': 'card club_breakup (2015Q1 or later)', 'at_handover': ['buy_out', 'dissolve'],
             'buy_out': 'pay each friend their share at 2016Q4 value; machines and coins become yours and enter Act I',
             'dissolve': 'machines sold at the used price, coins at the 2016Q4 price, everything split by shares',
             'chapter_report': 'Act I names the friends as the founding crew if bought out (text only)'}})

save('custody_additions.json', {
 'schema_version': 1,
 'notes': 'Append to custody.json. pools.fee_pct_by_year already covers 2010-2016 (do not repeat); these add named real pools as reference rows, and the altcoin selling limits. Altcoins are always held in the player wallet (doc 51 v1.0 §5): exchange collapses move price and trust only.',
 'pools_reference_fees': [
  {'year': '2011', 'pool': 'DeepBit', 'scheme': 'Proportional / PPS', 'fee': '3% / 10%', 'grade': 'B', 'source': 'Bitcoin Wiki, Comparison of mining pools (doc 53 B1)'},
  {'year': '2011', 'pool': 'BTC Guild', 'scheme': 'Proportional, then PPS', 'fee': '0%, then 5%', 'grade': 'B', 'source': 'doc 53 B1'},
  {'year': '2011', 'pool': 'Eligius', 'scheme': 'CPPSRB', 'fee': '0%', 'grade': 'C', 'source': 'doc 53 B1'},
  {'year': '2013', 'pool': 'BTC Guild', 'scheme': 'PPLNS / PPS', 'fee': '3% / 7.5%', 'grade': 'C', 'source': 'doc 53 B1'}],
 'altcoin_selling_limits': {
  'free_share_of_avg_daily_volume': V(0.005, 'D', 'doc 53 A6'), 'slippage': V('price -1% for each further 0.5% of average daily volume', 'D', 'doc 53 A6'), 'hard_cap_share_of_avg_daily_volume': V(0.02, 'D', 'doc 53 A6'),
  'avg_daily_volume_usd': {
   'LTC': {'2011': V(20000, 'D', 'no data; second research pass'), '2012': V(20000, 'D', 'no data; second research pass'), '2013': V(295900, 'C', 'CoinLore Apr-Dec'), '2014': V(5800000, 'C', 'CoinLore'), '2015': V(3400000, 'C', 'CoinLore'), '2016': V(3100000, 'C', 'CoinLore')},
   'DOGE': {'2013': V(101800, 'C', 'CoinLore Dec'), '2014': V(1100000, 'C', 'CoinLore'), '2015': V(168500, 'C', 'CoinLore'), '2016': V(256500, 'C', 'CoinLore')}}},
 'handover': {'altcoins': 'sold over 2016Q4 within the selling limits, at the weekly prices; any left after the cap converts at the 2016Q4 close x 0.9 (designed haircut); no altcoin enters Act I',
              'chapter_report_later_prices': 'dated LTC and DOGE closes at end 2017, end 2021 and the latest full year (second research pass)'}})
print('part 2 ok')

def card(id, type, title, trigger, body, choices, real_basis, source, week=None, weight=None):
    return {'id': id, 'type': type, 'title': title, 'trigger': trigger, 'week': week, 'weight': weight, 'body': body,
            'choices': [{'label': l, 'effects': e} for l, e in choices], 'real_basis': real_basis, 'source': source}
NOTED = [('Noted', {})]
news = [
 card('news_ltc_launch', 'scripted', 'A Coin for GPUs', 'fixed:2011Q4', 'A new coin called Litecoin goes live. It uses scrypt, a puzzle meant to suit ordinary CPUs and GPUs rather than the FPGA boards bitcoin is moving to. Your GPU can mine it from today.', [('Point a GPU at it (Rig screen)', {'flag': 'tried_ltc'}), ('Stay on bitcoin', {})], 'Litecoin client 0.1.0 released 7 Oct 2011, network live 13 Oct 2011 [B/C]', 'doc 53 A1', week='2011-10-10'),
 card('news_pool_ddos_wave', 'news', 'Pools Under Fire', 'fixed:2011Q3', 'Pools across the forums report floods of junk traffic. The biggest pools are hit most often.', NOTED, 'Pools were the main DDoS target in the second half of 2011 (Vasek, Thornton, Moore, FC 2014) [A]', 'doc 53 B2'),
 card('news_host_breach', 'news', 'A Hosting Breach', 'fixed:2012Q1', 'A hosting provider is breached and a well-known pool loses 3,094 BTC from its hot wallet. Its operator covers the loss himself.', NOTED, 'Linode breach, 1 Mar 2012 [B]', 'doc 53 B2', week='2012-02-27'),
 card('news_chain_split', 'news', 'The Chain Splits', 'fixed:2013Q1', 'A software upgrade splits the bitcoin chain for a few hours. Several pools lose block rewards before it is patched.', NOTED, '0.8/0.7 fork, 11 Mar 2013 [C]', 'doc 53 B2', week='2013-03-11'),
 card('news_pool_payout_theft', 'news', 'A Payout Script Hijacked', 'fixed:2013Q2', "A mid-size pool's payout script is hijacked and 923 BTC goes out. A web wallet freezes 569 of it and sends it back.", NOTED, 'Ozcoin, 19 Apr 2013 [B]', 'doc 53 B2', week='2013-04-15'),
 card('news_ltc_doubles', 'news', 'Silver Doubles', 'fixed:2013Q4', 'Litecoin nearly doubles in a day. Every forum thread asks which Radeon to buy.', NOTED, '28 Nov 2013 [B]', 'doc 53 A5', week='2013-11-25'),
 card('news_doge_launch', 'news', 'A Joke Coin', 'fixed:2013Q4', 'A coin with a Shiba Inu logo launches. Its block rewards are random, up to a million coins a block. It also runs on scrypt.', NOTED, 'Dogecoin launched 6 Dec 2013 [B]', 'doc 53 A1', week='2013-12-02'),
 card('news_gpu_shortage', 'news', 'Radeons Sell Out', 'fixed:2013Q4', 'High-end Radeons sell out. Some go for over $700, well above list.', NOTED, 'Dec 2013 street prices [B]', 'doc 53 Part C', week='2013-12-09'),
 card('news_scrypt_asic_preorders', 'news', 'Scrypt ASICs, Pay Now', 'fixed:2014Q1', 'The first scrypt ASIC pre-orders open. Pay now, ship later. GPU miners do the arithmetic.', NOTED, 'pre-orders from 3 Jan 2014 [B]', 'doc 53 A4', week='2013-12-30'),
 card('news_doge_fixed', 'news', 'Dogecoin Fixes Its Reward', 'fixed:2014Q1', 'Dogecoin forks at block 145,000: a fixed 250,000 reward and difficulty that adjusts every block. Hopping onto lucky blocks stops paying.', NOTED, '17 Mar 2014 [A/B]', 'doc 53 A1', week='2014-03-17'),
 card('news_doge_nascar', 'news', 'A Dog on the Track', 'fixed:2014Q2', 'A car wrapped in a cartoon dog races at Talladega, paid for with 67.8 million tipped coins.', NOTED, '4 May 2014 [B]', 'doc 53 Part C', week='2014-04-28'),
 card('scrypt_boxes_ship', 'scripted', 'The Boxes Ship', 'fixed:2014Q3', 'Scrypt ASIC boxes start shipping and the Litecoin network passes 1 TH/s. A GPU that earned dollars a day last winter earns cents. Used GPUs still sell, for now.', [('Sell every GPU on scrypt at the used price', {'sell_scrypt_gpus': True}), ('Keep them running', {})], 'Shipping from early Sep 2014; 1 TH/s on 15 Sep 2014 [B]', 'doc 53 A4, A2', week='2014-09-08'),
 card('news_merged_mining', 'news', 'Two Coins for One', 'fixed:2014Q3', 'Dogecoin passes block 371,337. Litecoin mining now earns Dogecoin too, for the same work.', NOTED, 'AuxPoW active 11 Sep 2014 [A/B]', 'doc 53 A1', week='2014-09-08'),
 card('news_alt_exchange_collapse', 'news', 'An Exchange Goes Dark', 'fixed:2014Q4', 'A Dogecoin exchange declares bankruptcy and its sister exchange goes dark. About 3,700 BTC is missing. Your coins are in your own wallet.', NOTED, 'Moolah/MintPal, Oct 2014 [B]', 'doc 53 Part C'),
 card('news_ltc_halving', 'news', 'Litecoin Halves', 'fixed:2015Q3', 'Litecoin block 840,000: the reward falls from 50 to 25.', NOTED, '25 Aug 2015 [A/B]', 'doc 53 A1', week='2015-08-24'),
 card('news_cloud_ponzi', 'news', 'Cloud Mining, Charged', 'fixed:2015Q4', 'Regulators charge a cloud-mining seller with running a Ponzi scheme. Its virtual miners stopped paying a year ago.', NOTED, 'SEC charges against GAW Miners, 1 Dec 2015 [A]', 'doc 53 Part C', week='2015-11-30'),
 card('news_alt_exchange_stuck', 'news', 'Withdrawals Pending', 'fixed:2016Q1', 'A big altcoin exchange stops after months of stuck withdrawals. A class action follows.', NOTED, 'Cryptsy, class action 13 Jan 2016 [A/B]', 'doc 53 Part C', week='2016-01-11')]

pool = [
 card('pool_ddos', 'random', 'Your Pool Is Down', 'random:pool_open', 'Halfblock Pool has been flooded with junk traffic since last night. Miners are asking in the thread whether to leave.', [('Buy DDoS protection (from next quarter; 1 Bandwidth)', {'pool': {'outage': True, 'buy_ddos_protection': True}, 'bandwidth_next': -1}), ('Ride it out', {'pool': {'outage': True}})], 'Pool DDoS attacks 2011-2013 (Vasek et al.) [A]', 'pools_player.json risks_per_quarter.ddos', weight=1.0),
 card('pool_theft', 'random', 'The Hot Wallet Is Empty', 'random:pool_open and not cold_storage', "Someone got into the server overnight. The pool's payout wallet is empty and miners are owed a week of earnings.", [('Pay the miners from your own cash', {'pool': {'theft': True, 'repay_from_cash': True}}), ('Pay what is left and explain', {'pool': {'theft': True, 'repay_from_cash': False, 'reputation': -30}})], 'Pool hot-wallet thefts of 3,094 BTC (Mar 2012) and 923 BTC (Apr 2013); the first operator repaid from his own funds [B]', 'pools_player.json risks_per_quarter.hot_wallet_theft', weight=1.0),
 card('pool_pps_crunch', 'scripted', 'A Run of Bad Luck', 'trigger:pps and cash_below_reserve', 'Under PPS you pay every share, block or no block. The pool has found few blocks for weeks and your cash is thinning.', [('Switch to PPLNS (1 Bandwidth next quarter)', {'pool': {'set_method': 'PPLNS'}, 'bandwidth_next': -1}), ('Keep paying and hope', {})], 'PPS shifts variance to the operator (custody.json payout_methods)', 'pools_player.json payout_methods.PPS'),
 card('pool_boycott_2014', 'scripted', 'Miners on the Move', 'fixed:2014Q2 if pool_open', 'One pool came close to half of all bitcoin mining. Miners are spreading out to smaller pools, and some are asking about yours.', [('Cut the fee to 0% for two quarters', {'pool': {'fee_override': 0.0, 'duration_quarters': 2, 'boycott_eligible': True}}), ('Keep your fee', {'pool': {'boycott_eligible': 'if_fee_at_or_below_median'}})], 'GHash.IO briefly above 50% of network hashrate, 12-13 Jun 2014 (custody.json note) [B]', 'pools_player.json boycott_2014', week='2014-06-09'),
 card('pool_sale_offer', 'random', 'An Offer for the Pool', 'random:pool_open and quarter>=2013Q1', 'The operator of CopperHash wants to fold your miners into his pool. He offers cash for the pool, the domain and the user list.', [('Sell at his price', {'pool': {'sell': True}}), ('Keep running it', {})], 'Invented; no sourced small-pool sale found (doc 53)', 'pools_player.json sale', weight=0.5)]

club = [
 card('club_form', 'scripted', 'Three Friends and a Spreadsheet', 'fixed:2013Q1', "Mara, Teo and Jun want in on the ASIC group buy everyone is talking about. Teo brings his two Radeons. Jun has a spreadsheet. They want you, because you have actually mined before.", [('Join (1 Bandwidth; choose your stake, who holds the keys and where it runs)', {'club': {'join': True}, 'bandwidth_next': -1}), ('Wish them luck', {})], 'Forum group buys of early ASICs, 2012-2013 (preorders.json group_buy) [B]; the friends are invented', 'club.json'),
 card('club_power_bill', 'random', 'Who Pays the Power?', 'random:club_member and quarter>=2013Q2', "The power bill for the club's machines has doubled. Jun wants every machine metered. Mara says that is how friendships end.", [('Split it by shares', {'club': {'cost_split': 'shares'}}), ('Pay it yourself this quarter', {'cash': 'club_power_quarter'}), ('Let them argue', {'club': {'dispute': True}})], 'Invented', 'club.json', weight=1.0),
 card('club_peak_cashout', 'scripted', 'Teo Wants Out', 'fixed:2013Q4 if club_member', 'Bitcoin is over $1,000. Teo wants his share in cash before it falls.', [('Buy his share at market value', {'club': {'buy_out': 'teo'}}), ('Let him sell his share of the coins', {'club': {'member_sells': 'teo'}}), ('Ask him to wait', {'club': {'refuse': 'teo', 'friendship': -1}})], 'December 2013 peak (events_prologue.json peak_and_silk_road) [B]; Teo is invented', 'club.json', week='2013-12-02'),
 card('club_gpu_flip', 'scripted', 'Someone Wants the Radeons', 'fixed:2014Q1 if club_member', "A forum buyer offers one and a half times what Teo's cards cost. Scrypt ASIC pre-orders are open.", [("Sell the club's GPUs", {'club': {'sell_gpus_mult': 1.5}}), ('Keep them mining', {})], 'GPU prices peaked in early 2014 ($900 against a $550 launch, 4 Mar 2014) [B]', 'doc 53 Part C', week='2014-03-03'),
 card('club_scrypt_box', 'scripted', 'A Box for the Club', 'fixed:2014Q2 if club_member', "Jun wants the club to put money into a share of a $9,995 scrypt box from ScryptBox Ltd, shipping 'next quarter'.", [('Buy a quarter share for the club', {'club': {'preorder': 'scrypt_box_share'}}), ('Pass', {})], 'Scrypt box pre-orders at $9,995 in Mar 2014, shipping Sep 2014 [B]; vendor invented', 'doc 53 A4'),
 card('club_cloud_contract', 'random', 'Daily Payouts, Guaranteed', 'random:club_member and quarter in(2014Q3,2014Q4)', "Jun's cousin bought cloud mining contracts that pay out every day. No machines, no power bill. He wants the club to buy in.", [('Put the club money in', {'club': {'cloud_contract': True}}), ('Pass', {})], 'Cloud-mining Hashlets sold from Aug 2014; payouts fell below fees by Nov 2014; shut Jan 2015; SEC charges Dec 2015 [A]; the seller is invented', 'doc 53 Part C', weight=1.0),
 card('club_breakup', 'scripted', 'The Spreadsheet Has to Close', 'fixed:2015Q1 if club_member', 'The GPUs earn pennies. Mara wants to sell, Teo wants to keep going, and Jun wants the spreadsheet settled.', [('Buy everyone out', {'club': {'end': 'buy_out'}}), ('Sell up and split', {'club': {'end': 'dissolve'}}), ('Keep the club going to the end', {})], 'Invented', 'club.json endings')]

save('events_prologue_expansion.json', {
 'schema_version': 1,
 'notes': "Cards to merge into events_prologue.json's events list. New things the loader must learn: type 'news' (a headline in the Signals or news list, no pause, no choice; its single 'Noted' choice is for the schema only); trigger predicates pool_open, cold_storage, club_member, pps, cash_below_reserve, 'fixed:<quarter> if <predicate>' and 'trigger:<predicate>'; effect keys pool{...}, club{...} and sell_scrypt_gpus. Existing effect keys (cash, flag, bandwidth_next, duration_quarters) keep their meaning.",
 'events': news + pool + club})

save('text_prologue_expansion.en.json', {
 'tooltip.p0.own_pool': 'Run your own pool: other miners point their machines at your server and you keep a fee. Fees, uptime and luck decide whether they stay.',
 'tooltip.p0.pool_pps': 'PPS pays miners for every share whether or not the pool finds a block. You carry the luck, so you need cash in reserve.',
 'tooltip.p0.pool_pplns': 'PPLNS pays miners only when the pool finds a block. They carry the luck, so they expect a lower fee.',
 'tooltip.p0.cold_storage': 'Keep most of the payout money offline. A break-in can then only take what is on the server.',
 'tooltip.p0.club': 'A club pools money with friends. Shares follow what each put in. Whoever holds the keys holds the risk.',
 'tooltip.p0.coin_choice': 'GPUs can mine bitcoin, Litecoin or Dogecoin. FPGAs and ASICs mine bitcoin only.',
 'tooltip.p0.alt_selling': 'Litecoin and Dogecoin trade in thin markets. Selling a lot at once moves the price against you.',
 'glossary.scrypt': 'Scrypt: the puzzle Litecoin and Dogecoin use. It was meant to resist FPGAs and ASICs, and did until 2014.',
 'glossary.litecoin': 'Litecoin: a bitcoin copy from October 2011 with faster blocks and the scrypt puzzle.',
 'glossary.dogecoin': 'Dogecoin: a joke coin from December 2013 with random rewards at first, then fixed ones.',
 'glossary.merged_mining': 'Merged mining: one piece of work counts for two coins. From September 2014, Litecoin miners also earned Dogecoin.',
 'glossary.hot_wallet': 'Hot wallet: coins on an online server, ready to pay out. Convenient, and the first thing thieves look for.',
 'glossary.ddos': 'DDoS: a flood of junk traffic that knocks a server offline.',
 'chapter.p0.pool_sold': 'You sold {pool} for {value}.',
 'chapter.p0.pool_sold_handover': 'You sold {pool} when you moved on, for {value}.',
 'chapter.p0.pool_insolvent': '{pool} ran out of money under PPS and closed.',
 'chapter.p0.club_buyout': 'You bought out {names}. In Act I, they are the crew who helped you start.',
 'chapter.p0.club_dissolved': 'The club sold up and split {value}.',
 'chapter.p0.alts_sold': 'You sold {amount} {coin} in 2016 for {value}. At {later_date} those coins were worth {later_value}.'})
print('ok')

save('preorders_additions.json', {
 'schema_version': 1,
 'notes': "Append to preorders.json vendors. Offered only through the club card club_scrypt_box (2014Q2). Mines LTC (scrypt). The existing delay roll rules apply.",
 'vendors': [{'id': 'scrypt_box_share', 'name': 'ScryptBox Ltd (invented)', 'order_window': ['2014Q2', '2014Q2'], 'unit_model': 'scrypt_box_2014', 'share_of_unit': 0.25,
   'price_usd': V(2499, 'B/D', 'a quarter of a $9,995 box (Mar 2014 pre-orders, doc 53 A4) [B]'), 'hashrate_share_khs': V(62500, 'C/D', 'a quarter of about 250 MH/s (the shipped spec rose from 100 to about 400 MH/s, doc 53 A4)'),
   'power_kw_share': V(0.25, 'D', 'a quarter of about 1 kW'), 'promised_delivery_quarters_after_order': 1,
   'delay_roll': V({'on_time': 0.1, 'one_quarter_late': 0.5, 'two_quarters_late': 0.3, 'three_quarters_late': 0.1}, 'D', 'real boxes ordered in Mar 2014 shipped from Sep 2014'),
   'real_basis': 'Scrypt box pre-orders at $9,995 for 100 MH/s on 19 Mar 2014, shipping from early Sep 2014 [B]', 'source': 'doc 53 A4'}]})
print('preorders ok')
