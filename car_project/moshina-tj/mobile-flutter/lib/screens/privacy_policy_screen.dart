import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          t('privacy.title', lang),
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text, fontSize: 18),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(color: c.border, height: 1),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _section(
              lang == 'tj' ? 'Маълумот ҷамъоварӣшаванда' : 'Собираемые данные',
              lang == 'tj'
                  ? 'Мо маълумоти зеринро ҷамъ мекунем: рақами телефон ё email барои шиносоӣ, маълумоти эълон (акс, нарх, тавсиф), маълумоти профил.'
                  : 'Мы собираем: номер телефона или email для аутентификации, данные объявлений (фото, цена, описание), данные профиля.',
              c,
            ),
            _section(
              lang == 'tj' ? 'Истифодаи маълумот' : 'Использование данных',
              lang == 'tj'
                  ? 'Маълумот барои кор кардани хизматрасонии бозори мошин, фиристодани рамзҳои OTP ва дастгирии корбар истифода мешавад.'
                  : 'Данные используются для работы маркетплейса автомобилей, отправки OTP-кодов и поддержки пользователей.',
              c,
            ),
            _section(
              lang == 'tj' ? 'Хизматрасонии сонӣ' : 'Сторонние сервисы',
              lang == 'tj'
                  ? 'Мо бо хизматрасонҳои зерин кор мекунем: Cloudinary (нигоҳдории акс), Unimtx (SMS OTP), Resend (email OTP), Telegram Bot API.'
                  : 'Мы используем: Cloudinary (хранение фото), Unimtx (SMS OTP), Resend (email OTP), Telegram Bot API.',
              c,
            ),
            _section(
              lang == 'tj' ? 'Нигоҳдории маълумот' : 'Хранение данных',
              lang == 'tj'
                  ? 'Маълумот дар серверҳои бехатар нигоҳ дошта мешавад. Токени аутентификатсия дар дастгоҳи шумо нигоҳ дошта мешавад ва дар ҳар вақт пок карда мешавад.'
                  : 'Данные хранятся на защищённых серверах. Токен аутентификации хранится на вашем устройстве и может быть удалён в любое время через выход из аккаунта.',
              c,
            ),
            _section(
              lang == 'tj' ? 'Ҳуқуқи корбар' : 'Права пользователя',
              lang == 'tj'
                  ? 'Шумо метавонед маълумоти худро дида бароед, таҳрир кунед ё аккаунти худро пок кунед. Барои ин ба дастгирӣ нависед.'
                  : 'Вы можете просматривать, редактировать или удалить свои данные. Для этого обратитесь в службу поддержки.',
              c,
            ),
            _section(
              lang == 'tj' ? 'Тамос' : 'Контакты',
              lang == 'tj'
                  ? 'Саволҳо: support@tajcar.tj ё тавассути Telegram @tajcar_support.'
                  : 'По вопросам: support@tajcar.tj или Telegram @tajcar_support.',
              c,
            ),
            const SizedBox(height: 8),
            Text(
              lang == 'tj' ? 'Охирин навсозӣ: май 2026' : 'Последнее обновление: май 2026',
              style: TextStyle(color: c.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, String body, AppColors c) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: c.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: TextStyle(
              fontSize: 14,
              color: c.textSecondary,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}
